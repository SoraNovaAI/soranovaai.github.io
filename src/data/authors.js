/**
 * Author mapping - maps author keys to their GitHub usernames and display names
 * This allows for consistent author information across all blog posts
 */
export const AUTHORS = {
  luarss: {
    name: "Song Luar",
    github: "luarss"
  },
  soranova: {
    name: "SoraNova Team",
    github: "soranovaai"
  },
  amadeus: {
    name: "Amadeus Winarto",
    github: "amadeus-winarto"
  },
  daviddl: {
    name: "David Livingston",
    github: "daviddl9"
  },
  // Add more authors here as needed
  // example: {
  //   name: "John Doe",
  //   github: "johndoe"
  // }
}

/**
 * Get author information by key
 * @param {string} authorKey - The author key
 * @returns {Object|null} Author object with name and github, or null if not found
 */
export function getAuthor(authorKey) {
  if (!authorKey) return null
  return AUTHORS[authorKey] || null
}

/**
 * Resolve author - handles both string keys and author objects
 * @param {string|Object} author - Author key or author object
 * @returns {Object|null} Author object with name and github
 */
export function resolveAuthor(author) {
  if (!author) return null

  // If it's already an object with github, return it
  if (typeof author === 'object' && author.github) {
    return author
  }

  // If it's a string key, look it up
  if (typeof author === 'string') {
    return getAuthor(author)
  }

  return null
}
