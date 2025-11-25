/**
 * Navigation structure for documentation
 * Defines the sidebar categories and order for each product
 */

/**
 * Documentation products configuration
 */
export const DOCS_PRODUCTS = {
  'agent-runtime': {
    name: 'Agent Runtime',
    description: 'Python framework for building AI agents with tool integration, multi-agent workflows, and evaluation loops.',
    github: 'https://github.com/soranovaai/agent-runtime'
  }
};

/**
 * Category order for documentation sidebar
 * Categories not listed here will appear at the end
 */
export const CATEGORY_ORDER = {
  'agent-runtime': [
    'Getting Started',
    'Guides',
    'Reference'
  ]
};

/**
 * Get the sort order for a category within a product
 * @param {string} product - The product name
 * @param {string} category - The category name
 * @returns {number} The sort order (lower = higher priority)
 */
export function getCategoryOrder(product, category) {
  const order = CATEGORY_ORDER[product];
  if (!order) return 999;
  const index = order.indexOf(category);
  return index === -1 ? 999 : index;
}

/**
 * Sort categories according to the defined order
 * @param {string} product - The product name
 * @param {string[]} categories - Array of category names
 * @returns {string[]} Sorted category names
 */
export function sortCategories(product, categories) {
  return [...categories].sort((a, b) => {
    return getCategoryOrder(product, a) - getCategoryOrder(product, b);
  });
}

/**
 * Build navigation structure from docs array
 * @param {string} product - The product name
 * @param {Array} docs - Array of doc metadata
 * @returns {Array} Navigation structure with categories and items
 */
export function buildNavigation(product, docs) {
  // Group by category
  const grouped = {};
  for (const doc of docs) {
    const category = doc.category || 'General';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(doc);
  }

  // Sort items within each category by order
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => a.order - b.order);
  }

  // Build navigation array with sorted categories
  const sortedCategories = sortCategories(product, Object.keys(grouped));

  return sortedCategories.map(category => ({
    category,
    items: grouped[category]
  }));
}

/**
 * Get previous and next docs for navigation
 * @param {Array} docs - Array of doc metadata (sorted by order)
 * @param {string} currentSlug - The current doc slug
 * @returns {{ prev: Object|null, next: Object|null }}
 */
export function getPrevNextDocs(docs, currentSlug) {
  const index = docs.findIndex(doc => doc.slug === currentSlug);

  return {
    prev: index > 0 ? docs[index - 1] : null,
    next: index < docs.length - 1 ? docs[index + 1] : null
  };
}
