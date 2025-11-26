import { useMemo } from 'react'
import StructuredData from './StructuredData'

/**
 * Generates JSON-LD structured data for documentation pages
 * Helps search engines and AI understand the technical documentation
 */
function DocsStructuredData({ doc, product, content }) {
  const data = useMemo(() => {
    if (!doc || !product) return null

    return {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      'headline': doc.title,
      'description': `${product.name} documentation: ${doc.title}`,
      'articleSection': doc.category || 'Documentation',
      'author': {
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
        '@id': `https://soranovaai.github.io/docs/${product.key}/${doc.slug}`
      },
      'inLanguage': 'en-US',
      'isPartOf': {
        '@type': 'TechArticle',
        'name': `${product.name} Documentation`,
        'url': `https://soranovaai.github.io/docs/${product.key}`
      },
      'wordCount': content ? content.split(/\s+/).length : 0
    }
  }, [doc, product, content])

  const meta = useMemo(() => {
    if (!doc || !product) return {}
    return {
      title: `${doc.title} - ${product.name} | SoraNova Docs`,
      description: `${product.name} documentation: ${doc.title} - ${doc.category || 'Technical documentation'}`
    }
  }, [doc, product])

  if (!doc || !product) return null

  return <StructuredData data={data} id="docs-structured-data" meta={meta} />
}

export default DocsStructuredData
