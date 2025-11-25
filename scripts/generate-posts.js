import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '../public/posts');
const DOCS_DIR = path.join(__dirname, '../public/docs');
const OUTPUT_FILE = path.join(__dirname, '../public/posts.json');
const LLMS_TXT_FILE = path.join(__dirname, '../public/llms.txt');
const MERMAID_CONFIG = path.join(__dirname, 'mermaid-diagrams/mermaid-config.json');
const PUPPETEER_CONFIG = path.join(__dirname, 'mermaid-diagrams/puppeteer-config.json');

async function generateMermaidDiagrams() {
  try {
    console.log('🎨 Generating Mermaid diagrams...');

    // Find all .mmd files in public/images directory
    const imagesDir = path.join(__dirname, '../public/images');
    const mmdFiles = [];

    async function findMmdFiles(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await findMmdFiles(fullPath);
        } else if (entry.name.endsWith('.mmd')) {
          mmdFiles.push(fullPath);
        }
      }
    }

    await findMmdFiles(imagesDir);

    if (mmdFiles.length === 0) {
      console.log('   ℹ️  No .mmd files found to process');
      return;
    }

    // Generate PNG for each .mmd file
    for (const mmdFile of mmdFiles) {
      const outputFile = mmdFile.replace('.mmd', '.png');
      const relativePath = path.relative(path.join(__dirname, '..'), mmdFile);

      try {
        // Use local mmdc from node_modules
        const mmdc = path.join(__dirname, '../node_modules/.bin/mmdc');
        const cmd = `"${mmdc}" -i "${mmdFile}" -o "${outputFile}" -c "${MERMAID_CONFIG}" -b transparent -w 1400 -p "${PUPPETEER_CONFIG}"`;
        await execAsync(cmd);
        console.log(`   ✅ Generated ${path.basename(outputFile)} from ${relativePath}`);
      } catch (error) {
        console.error(`   ❌ Failed to generate ${path.basename(outputFile)}:`, error.message);
      }
    }

    console.log(`✅ Processed ${mmdFiles.length} Mermaid diagram(s)`);

  } catch (error) {
    console.error('❌ Error generating Mermaid diagrams:', error);
    // Don't exit on diagram generation failure, continue with post generation
  }
}

async function generatePostsIndex() {
  try {
    // Generate Mermaid diagrams first
    await generateMermaidDiagrams();

    // Read all markdown files from posts directory
    const files = await fs.readdir(POSTS_DIR);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    const posts = [];
    const postsWithContent = {};

    for (const file of markdownFiles) {
      const filePath = path.join(POSTS_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter
      const { data, content } = matter(fileContent);

      // Generate slug from filename if not provided
      const slug = data.slug || path.basename(file, '.md');

      // Validate required fields
      if (!data.title) {
        console.warn(`⚠️  Skipping ${file}: missing title in frontmatter`);
        continue;
      }

      posts.push({
        slug,
        title: data.title,
        date: data.date || new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        readTime: data.readTime || '5 min read',
        author: data.author || null,
        tags: data.tags || [],
        excerpt: data.excerpt || ''
      });

      // Store content separately
      postsWithContent[slug] = content;
    }

    // Sort posts by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Write metadata to posts.json
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(posts, null, 2));

    // Write content map to posts-content.json
    const contentFile = path.join(__dirname, '../public/posts-content.json');
    await fs.writeFile(contentFile, JSON.stringify(postsWithContent, null, 2));

    console.log(`✅ Generated posts.json with ${posts.length} post(s)`);
    posts.forEach(post => {
      console.log(`   - ${post.title}`);
    });

    // Generate llms.txt dynamically
    await generateLlmsTxt(posts);

  } catch (error) {
    console.error('❌ Error generating posts index:', error);
    process.exit(1);
  }
}

async function generateLlmsTxt(posts) {
  try {
    // Collect all unique tags
    const allTags = [...new Set(posts.flatMap(post => post.tags))].sort();

    // Build llms.txt content
    const llmsTxt = `# SoraNova Engineering Blog

> A technical blog covering software engineering, architecture, and modern development practices

## About

The SoraNova Engineering Blog is a resource for software engineers and developers interested in:
- System architecture and design patterns
- Microservices and distributed systems
- Backend development best practices
- Modern web development technologies
- Software engineering insights and tutorials

## Content Structure

All blog posts are available in markdown format with the following structure:
- Title, date, and reading time
- Tags for categorization
- Detailed technical content with code examples
- Practical insights and real-world applications

## Topics Covered

${allTags.map(tag => `- ${tag}`).join('\n')}

## Recent Blog Posts

${posts.slice(0, 10).map(post => `### ${post.title}
- Published: ${post.date}
- Reading time: ${post.readTime}
- Topics: ${post.tags.join(', ')}
- ${post.excerpt}
- URL: /post/${post.slug}`).join('\n\n')}

## All Posts Index

The complete list of ${posts.length} blog post${posts.length !== 1 ? 's' : ''} is available at:
/posts.json

Individual posts are located at:
/posts/{slug}.md

## Navigation

- Home: /
- Blog listing: /
- Individual posts: /post/{slug}

## Purpose

This blog aims to share practical engineering knowledge, real-world solutions, and technical insights to help developers build better software systems.

## Contact & Attribution

When citing content from this blog, please reference:
- Blog name: SoraNova Engineering Blog
- URL: https://soranovaai.github.io
- Content is technical, educational, and based on software engineering best practices

## Content Focus

The blog specializes in:
1. Scalable system architecture
2. Microservices design patterns
3. Event-driven architecture
4. Backend engineering
5. Modern development workflows

All content includes practical code examples, architectural concepts, and actionable insights for software engineers.

---
Last updated: ${new Date().toISOString().split('T')[0]}
Total posts: ${posts.length}
`;

    await fs.writeFile(LLMS_TXT_FILE, llmsTxt);
    console.log(`✅ Generated llms.txt with ${posts.length} post references`);

  } catch (error) {
    console.error('❌ Error generating llms.txt:', error);
    throw error;
  }
}

async function generateDocsIndex() {
  try {
    // Check if docs directory exists
    try {
      await fs.access(DOCS_DIR);
    } catch {
      console.log('ℹ️  No docs directory found, skipping docs generation');
      return;
    }

    // Get all product directories in docs
    const productDirs = await fs.readdir(DOCS_DIR, { withFileTypes: true });
    const products = productDirs.filter(d => d.isDirectory()).map(d => d.name);

    if (products.length === 0) {
      console.log('ℹ️  No documentation products found');
      return;
    }

    for (const product of products) {
      const productDir = path.join(DOCS_DIR, product);
      const files = await fs.readdir(productDir);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      const docs = [];
      const docsWithContent = {};

      for (const file of markdownFiles) {
        const filePath = path.join(productDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');

        // Parse frontmatter
        const { data, content } = matter(fileContent);

        // Generate slug from filename
        const slug = path.basename(file, '.md');

        // Validate required fields
        if (!data.title) {
          console.warn(`⚠️  Skipping ${file}: missing title in frontmatter`);
          continue;
        }

        docs.push({
          slug,
          title: data.title,
          order: data.order || 999,
          category: data.category || 'General'
        });

        // Store content separately
        docsWithContent[slug] = content;
      }

      // Sort docs by order
      docs.sort((a, b) => a.order - b.order);

      // Write metadata to docs-{product}.json
      const docsOutputFile = path.join(__dirname, `../public/docs-${product}.json`);
      await fs.writeFile(docsOutputFile, JSON.stringify(docs, null, 2));

      // Write content map to docs-{product}-content.json
      const contentFile = path.join(__dirname, `../public/docs-${product}-content.json`);
      await fs.writeFile(contentFile, JSON.stringify(docsWithContent, null, 2));

      console.log(`✅ Generated docs-${product}.json with ${docs.length} doc(s)`);
      docs.forEach(doc => {
        console.log(`   - [${doc.category}] ${doc.title}`);
      });
    }

  } catch (error) {
    console.error('❌ Error generating docs index:', error);
    // Don't exit on docs generation failure, continue
  }
}

async function main() {
  await generatePostsIndex();
  await generateDocsIndex();
}

main();
