# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoraNova Engineering Blog - a React/Vite static blog deployed to GitHub Pages.

## Essential Commands

```bash
npm install                    # Install dependencies
npm run generate-posts         # Generate posts.json, posts-content.json, llms.txt, and Mermaid PNGs
npm run dev                    # Start development server
npm run build                  # Build for production
```

**Important**: Always run `npm run generate-posts` after modifying markdown files in `public/posts/`.

Deployment is automatic on push to `main` via GitHub Actions.

## Architecture

### Build-Time Content Processing

The blog uses a **build-time generation pattern**:

1. **Source**: Markdown files in `public/posts/` with frontmatter
2. **Build** (`scripts/generate-posts.js`):
   - Parses frontmatter with `gray-matter`
   - Generates `public/posts.json` (metadata) and `public/posts-content.json` (content)
   - Auto-generates `public/llms.txt` for AI discoverability
   - Converts `.mmd` → `.png` from `public/images/` using `@mermaid-js/mermaid-cli`
3. **Runtime**: React fetches from pre-generated JSON, not raw markdown

### Key Data Flow

- `src/data/blogPosts.js` - `loadBlogPosts()` fetches metadata, `loadBlogPost(slug)` fetches content
- `src/data/authors.js` - Maps author keys to `{ name, github }` objects
- Author resolution happens at runtime via `resolveAuthor()`

### Routes

- `/` - Blog listing (Home.jsx)
- `/post/:slug` - Individual post (BlogPost.jsx)
- `/about` - About page

## Adding Blog Posts

1. Create `public/posts/your-slug.md` (see `POST_TEMPLATE.md`)
2. If author is new, add to `src/data/authors.js`
3. Run `npm run generate-posts`
4. Test with `npm run dev`

**Frontmatter Format**:
```yaml
---
title: "Your Post Title"
date: "Month Day, Year"
readTime: "X min read"
tags: ["Tag1", "Tag2"]
excerpt: "1-2 sentence summary"
author: "authorKey"       # Optional, must exist in authors.js
slug: "custom-slug"       # Optional, defaults to filename
---
```

## Mermaid Diagrams

1. Create `.mmd` files in `public/images/[post-name]/`
2. Run `npm run generate-posts` to convert to PNG
3. Reference: `![Description](/images/[post-name]/diagram.png)`
4. Config files: `scripts/mermaid-diagrams/mermaid-config.json`, `puppeteer-config.json`

## File Ownership

- **Auto-generated (never edit)**: `public/posts.json`, `public/posts-content.json`, `public/llms.txt`
- **Source of truth**: Markdown files in `public/posts/`
