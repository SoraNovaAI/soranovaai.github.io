import { useEffect } from 'react'

/**
 * Generic component for injecting JSON-LD structured data into the page
 * @param {Object} data - The structured data object
 * @param {string} id - Unique ID for the script tag
 * @param {Object} meta - Optional meta tags to set (title, description)
 */
function StructuredData({ data, id, meta = {} }) {
  useEffect(() => {
    if (!data) return

    // Create or update script tag
    let scriptTag = document.getElementById(id)

    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.id = id
      scriptTag.type = 'application/ld+json'
      document.head.appendChild(scriptTag)
    }

    scriptTag.textContent = JSON.stringify(data, null, 2)

    // Update page title if provided
    if (meta.title) {
      document.title = meta.title
    }

    // Update meta description if provided
    if (meta.description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.name = 'description'
        document.head.appendChild(metaDescription)
      }
      metaDescription.content = meta.description
    }

    // Cleanup on unmount
    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag)
      }
    }
  }, [data, id, meta])

  return null // This component doesn't render anything
}

export default StructuredData
