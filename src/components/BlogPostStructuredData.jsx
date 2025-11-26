import { useMemo } from 'react'
import StructuredData from './StructuredData'

/**
 * Generates JSON-LD structured data for blog posts
 * Helps search engines and AI understand the content
 */
function BlogPostStructuredData({ post, content }) {
  const data = useMemo(() => {
    if (!post) return null

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.excerpt,
      'datePublished': new Date(post.date).toISOString(),
      'dateModified': new Date(post.date).toISOString(),
      'author': post.author && post.author.github ? {
        '@type': 'Person',
        'name': post.author.name || post.author.github,
        'url': `https://github.com/${post.author.github}`,
        'image': `https://github.com/${post.author.github}.png`
      } : {
        '@type': 'Organization',
        'name': 'SoraNova',
        'url': 'https://soranovaai.github.io'
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'SoraNova',
        'url': 'https://soranovaai.github.io',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://soranovaai.github.io/favicon.png'
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `https://soranovaai.github.io/post/${post.slug}`
      },
      'keywords': post.tags.join(', '),
      'articleSection': post.tags[0] || 'Technology',
      'wordCount': content ? content.split(/\s+/).length : 0,
      'timeRequired': post.readTime,
      'inLanguage': 'en-US'
    }
  }, [post, content])

  const meta = useMemo(() => {
    if (!post) return {}
    return {
      title: `${post.title} | SoraNova Tech Blog`,
      description: post.excerpt
    }
  }, [post])

  if (!post) return null

  return <StructuredData data={data} id="blog-post-structured-data" meta={meta} />
}

export default BlogPostStructuredData
