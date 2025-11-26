import { Link } from 'react-router-dom';
import { DOCS_PRODUCTS } from '../data/docsNav';
import './DocsIndex.css';

function DocsIndex() {
  const products = Object.entries(DOCS_PRODUCTS);

  return (
    <div className="docs-index">
      <div className="container">
        <header className="docs-index-header">
          <h1>Documentation</h1>
          <p className="docs-index-subtitle">
            Explore our documentation to learn how to build with SoraNova tools and frameworks.
          </p>
        </header>

        <div className="docs-products-grid">
          {products.map(([productId, product]) => (
            <Link
              key={productId}
              to={`/docs/${productId}`}
              className="docs-product-card"
            >
              <div className="docs-product-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h2 className="docs-product-name">{product.name}</h2>
              <p className="docs-product-description">{product.description}</p>
              <span className="docs-product-link">
                View documentation
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="arrow-icon">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DocsIndex;
