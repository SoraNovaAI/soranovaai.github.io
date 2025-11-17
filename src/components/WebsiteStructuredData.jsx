import { useEffect } from 'react'

/**
 * Generates JSON-LD structured data for the website/blog listing
 * Helps search engines and AI understand the overall site structure
 */
function WebsiteStructuredData({ posts }) {
  useEffect(() => {
    // Create structured data for the website
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': 'SoraNova Engineering Blog',
      'description': 'Deep dives into AI infrastructure, GPU orchestration, and building scalable systems',
      'url': 'https://soranovaai.github.io',
      'inLanguage': 'en-US',
      'publisher': {
        '@type': 'Organization',
        'name': 'SoraNova',
        'url': 'https://soranovaai.github.io',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://soranovaai.github.io/favicon.png'
        }
      },
      'blogPost': posts.slice(0, 10).map(post => ({
        '@type': 'BlogPosting',
        'headline': post.title,
        'description': post.excerpt,
        'url': `https://soranovaai.github.io/post/${post.slug}`,
        'datePublished': new Date(post.date).toISOString(),
        'author': {
          '@type': 'Organization',
          'name': 'SoraNova'
        },
        'keywords': post.tags.join(', ')
      }))
    }

    // Create or update script tag
    let scriptTag = document.getElementById('website-structured-data')

    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.id = 'website-structured-data'
      scriptTag.type = 'application/ld+json'
      document.head.appendChild(scriptTag)
    }

    scriptTag.textContent = JSON.stringify(structuredData, null, 2)

    // Set homepage title and description
    document.title = 'SoraNova Tech Blog | AI Infrastructure & Engineering'

    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.name = 'description'
      document.head.appendChild(metaDescription)
    }
    metaDescription.content = 'Deep dives into AI infrastructure, GPU orchestration, and building scalable systems'

    // Cleanup on unmount
    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag)
      }
    }
  }, [posts])

  return null // This component doesn't render anything
}

export default WebsiteStructuredData
