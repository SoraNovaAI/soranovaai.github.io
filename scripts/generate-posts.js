import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '../public/posts');
const OUTPUT_FILE = path.join(__dirname, '../public/posts.json');
const LLMS_TXT_FILE = path.join(__dirname, '../public/llms.txt');

async function generatePostsIndex() {
  try {
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

generatePostsIndex();
