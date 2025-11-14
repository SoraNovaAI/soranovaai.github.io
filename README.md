# SoraNova Engineering Blog

## Quick Start

```bash
npm install
npm run generate-posts
npm run dev
```

## Adding New Posts

Create a new markdown file in `public/posts/` with YAML frontmatter:

**Example:** `public/posts/my-awesome-post.md`

```markdown
---
title: "My Awesome Post"
date: "December 1, 2025"
readTime: "5 min read"
tags: ["React", "Performance"]
excerpt: "A brief description of your post that appears in the blog listing"
---

# My Awesome Post

Your content here in markdown...

## Section 1

More content...
```

The slug is automatically generated from the filename (e.g., `my-awesome-post.md` → slug: `my-awesome-post`).

## Deploy

Push to main. The workflow automatically:
1. Generates posts index
2. Builds the site
3. Deploys to GitHub Pages
