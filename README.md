# SoraNova Engineering Blog

## Quick Start

```bash
npm install
npm run generate-posts
npm run dev
```

## Adding New Posts

Create a new markdown file in `public/posts/` using the [post template](./POST_TEMPLATE.md).


The slug is automatically generated from the filename (e.g., `my-awesome-post.md` → slug: `my-awesome-post`).

## Deploy

Push to main. The workflow automatically:
1. Generates posts index
2. Builds the site
3. Deploys to GitHub Pages
