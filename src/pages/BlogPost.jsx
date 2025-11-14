import { useParams, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { loadBlogPosts, loadBlogPost } from '../data/blogPosts'
import './BlogPost.css'

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper">
      <button onClick={handleCopy} className="copy-button" aria-label="Copy code">
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

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
    }).catch((error) => {
      console.error('Error loading post:', error)
      setLoading(false)
    })
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
          <ReactMarkdown
            components={{
              code: ({ node, inline, ...props }) =>
                inline ? <code {...props} /> : <CodeBlock {...props} />
            }}
          >
            {content}
          </ReactMarkdown>
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
