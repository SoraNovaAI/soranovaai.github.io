import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '../public/posts');
const OUTPUT_FILE = path.join(__dirname, '../public/posts.json');

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

  } catch (error) {
    console.error('❌ Error generating posts index:', error);
    process.exit(1);
  }
}

generatePostsIndex();
