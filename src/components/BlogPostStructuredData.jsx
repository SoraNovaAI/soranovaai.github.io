import { useEffect } from 'react'

/**
 * Generates JSON-LD structured data for blog posts
 * Helps search engines and AI understand the content
 */
function BlogPostStructuredData({ post, content }) {
  useEffect(() => {
    if (!post) return

    // Create structured data
    const structuredData = {
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

    // Create or update script tag
    let scriptTag = document.getElementById('blog-post-structured-data')

    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.id = 'blog-post-structured-data'
      scriptTag.type = 'application/ld+json'
      document.head.appendChild(scriptTag)
    }

    scriptTag.textContent = JSON.stringify(structuredData, null, 2)

    // Update page title and meta description
    document.title = `${post.title} | SoraNova Tech Blog`

    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.name = 'description'
      document.head.appendChild(metaDescription)
    }
    metaDescription.content = post.excerpt

    // Cleanup on unmount
    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag)
      }
    }
  }, [post, content])

  return null // This component doesn't render anything
}

export default BlogPostStructuredData
