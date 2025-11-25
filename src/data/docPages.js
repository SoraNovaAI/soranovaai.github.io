/**
 * Data loading functions for documentation pages
 */

/**
 * Load all doc pages metadata for a product
 * @param {string} product - The product name (e.g., 'agent-runtime')
 * @returns {Promise<Array>} Array of doc page metadata
 */
export async function loadDocPages(product) {
  try {
    const response = await fetch(`/docs-${product}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load docs for ${product}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading doc pages:', error);
    return [];
  }
}

/**
 * Load a single doc page content by slug
 * @param {string} product - The product name (e.g., 'agent-runtime')
 * @param {string} slug - The doc page slug
 * @returns {Promise<string>} The markdown content
 */
export async function loadDocPage(product, slug) {
  try {
    const response = await fetch(`/docs-${product}-content.json`);
    if (!response.ok) {
      throw new Error(`Failed to load doc content for ${product}`);
    }
    const allContent = await response.json();
    return allContent[slug] || '';
  } catch (error) {
    console.error('Error loading doc page:', error);
    return '';
  }
}

/**
 * Get doc page metadata by slug
 * @param {Array} docs - Array of doc metadata
 * @param {string} slug - The doc page slug
 * @returns {Object|null} The doc metadata or null if not found
 */
export function getDocBySlug(docs, slug) {
  return docs.find(doc => doc.slug === slug) || null;
}

/**
 * Group docs by category
 * @param {Array} docs - Array of doc metadata
 * @returns {Object} Docs grouped by category
 */
export function groupDocsByCategory(docs) {
  return docs.reduce((acc, doc) => {
    const category = doc.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {});
}
