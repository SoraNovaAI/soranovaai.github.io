import { useParams, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { loadBlogPosts, loadBlogPost } from '../data/blogPosts'
import './BlogPost.css'

function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loadBlogPosts(),
      loadBlogPost(slug)
    ]).then(([posts, markdown]) => {
      const postMeta = posts.find(p => p.slug === slug)
      setPost(postMeta)
      setContent(markdown)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [slug])

  if (loading) return <div>Loading...</div>
  if (!post) return <Navigate to="/" replace />

  return (
    <article className="blog-post">
      <div className="container blog-post-container">
        <header className="blog-post-header">
          <h1 className="blog-post-title">{post.title}</h1>
          <div className="blog-post-meta">
            <span className="blog-post-date">{post.date}</span>
            <span className="separator">•</span>
            <span className="blog-post-read-time">{post.readTime}</span>
          </div>
          <div className="blog-post-tags">
            {post.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </header>

        <div className="blog-post-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        <footer className="blog-post-footer">
          <div className="share-section">
            <p>Share this post:</p>
            <div className="share-buttons">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-button"
              >
                Twitter
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-button"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </footer>
      </div>
    </article>
  )
}

export default BlogPost
