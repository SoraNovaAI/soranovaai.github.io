// Load post metadata from posts.json
export async function loadBlogPosts() {
  const response = await fetch('/posts.json');
  return response.json();
}

// Load markdown content (without frontmatter)
export async function loadBlogPost(slug) {
  const response = await fetch('/posts-content.json');
  const allContent = await response.json();
  return allContent[slug] || '';
}
