import { useState, useEffect } from 'react'
import BlogCard from '../components/BlogCard'
import { loadBlogPosts } from '../data/blogPosts'
import './Home.css'

function Home() {
  const [selectedTag, setSelectedTag] = useState(null)
  const [blogPosts, setBlogPosts] = useState([])

  useEffect(() => {
    loadBlogPosts().then(setBlogPosts)
  }, [])

  const allTags = [...new Set(blogPosts.flatMap(post => post.tags))]

  const filteredPosts = selectedTag
    ? blogPosts.filter(post => post.tags.includes(selectedTag))
    : blogPosts

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">SoraNova Engineering</h1>
          <p className="hero-description">
            Deep dives into AI infrastructure, GPU orchestration, and building scalable systems
          </p>
        </div>
      </section>

      <section className="blog-section">
        <div className="container">
          <div className="filter-bar">
            <button
              className={`filter-tag ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              All Posts
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`filter-tag ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="blog-grid">
            {filteredPosts.map(post => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
