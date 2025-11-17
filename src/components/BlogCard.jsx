import { Link } from 'react-router-dom'
import { getGitHubAvatar, getGitHubProfileUrl } from '../utils/github'
import './BlogCard.css'

function BlogCard({ post }) {
  return (
    <article className="blog-card">
      <div className="blog-card-content">
        <div className="blog-meta">
          {post.author && post.author.github && (
            <>
              <a
                href={getGitHubProfileUrl(post.author.github)}
                target="_blank"
                rel="noopener noreferrer"
                className="blog-author-link"
              >
                <img
                  src={getGitHubAvatar(post.author.github, 32)}
                  alt={post.author.name || post.author.github}
                  className="blog-author-avatar"
                />
                <span className="blog-author-name">{post.author.name || post.author.github}</span>
              </a>
              <span className="blog-meta-separator">•</span>
            </>
          )}
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
