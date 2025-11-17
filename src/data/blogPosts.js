import { resolveAuthor } from './authors'

// Load post metadata from posts.json
export async function loadBlogPosts() {
  const response = await fetch('/posts.json');
  const posts = await response.json();

  // Resolve author references
  return posts.map(post => ({
    ...post,
    author: resolveAuthor(post.author)
  }));
}

// Load markdown content (without frontmatter)
export async function loadBlogPost(slug) {
  const response = await fetch('/posts-content.json');
  const allContent = await response.json();
  return allContent[slug] || '';
}
