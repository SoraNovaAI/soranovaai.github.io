import { Link } from 'react-router-dom'
import './BlogCard.css'

function BlogCard({ post }) {
  return (
    <article className="blog-card">
      <div className="blog-card-content">
        <div className="blog-meta">
          <span className="blog-date">{post.date}</span>
          <span className="blog-read-time">{post.readTime}</span>
        </div>
        <h2 className="blog-title">
          <Link to={`/post/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="blog-excerpt">{post.excerpt}</p>
        <div className="blog-tags">
          {post.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
        <Link to={`/post/${post.slug}`} className="read-more">
          Read more →
        </Link>
      </div>
    </article>
  )
}

export default BlogCard
