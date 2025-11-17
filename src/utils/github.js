/**
 * Get GitHub avatar URL for a given username
 * @param {string} username - GitHub username
 * @param {number} size - Avatar size in pixels (default: 80)
 * @returns {string} GitHub avatar URL
 */
export function getGitHubAvatar(username, size = 80) {
  if (!username) return null
  return `https://github.com/${username}.png?size=${size}`
}

/**
 * Get GitHub profile URL for a given username
 * @param {string} username - GitHub username
 * @returns {string} GitHub profile URL
 */
export function getGitHubProfileUrl(username) {
  if (!username) return null
  return `https://github.com/${username}`
}

/**
 * Fetch GitHub user information from the API
 * @param {string} username - GitHub username
 * @returns {Promise<Object|null>} User information or null if failed
 */
export async function fetchGitHubUser(username) {
  if (!username) return null

  try {
    const response = await fetch(`https://api.github.com/users/${username}`)
    if (!response.ok) {
      console.warn(`Failed to fetch GitHub user: ${username}`)
      return null
    }
    const data = await response.json()
    return {
      name: data.name || username,
      login: data.login,
      avatar_url: data.avatar_url,
      bio: data.bio,
      blog: data.blog,
      company: data.company,
      location: data.location,
      html_url: data.html_url
    }
  } catch (error) {
    console.error(`Error fetching GitHub user ${username}:`, error)
    return null
  }
}
