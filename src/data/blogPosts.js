// Load post metadata from posts.json
export async function loadBlogPosts() {
  const response = await fetch('/posts.json');
  return response.json();
}

// Load markdown content
export async function loadBlogPost(slug) {
  const response = await fetch(`/posts/${slug}.md`);
  return response.text();
}
