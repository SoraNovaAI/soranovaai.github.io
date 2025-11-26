import { useMemo } from 'react'
import StructuredData from './StructuredData'

/**
 * Generates JSON-LD structured data for the website/blog listing
 * Helps search engines and AI understand the overall site structure
 */
function WebsiteStructuredData({ posts }) {
  const data = useMemo(() => ({
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
    })),
    'hasPart': [
      {
        '@type': 'WebPage',
        'name': 'Documentation',
        'description': 'Technical documentation for SoraNova products',
        'url': 'https://soranovaai.github.io/docs'
      }
    ]
  }), [posts])

  const meta = useMemo(() => ({
    title: 'SoraNova Tech Blog | AI Infrastructure & Engineering',
    description: 'Deep dives into AI infrastructure, GPU orchestration, and building scalable systems'
  }), [])

  return <StructuredData data={data} id="website-structured-data" meta={meta} />
}

export default WebsiteStructuredData
