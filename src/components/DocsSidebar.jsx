import { Link, useLocation } from 'react-router-dom';
import { buildNavigation } from '../data/docsNav';
import './DocsSidebar.css';

function DocsSidebar({ product, docs }) {
  const location = useLocation();
  const navigation = buildNavigation(product, docs);

  // Extract current slug from URL
  const currentSlug = location.pathname.split('/').pop();

  return (
    <nav className="docs-sidebar">
      <div className="docs-sidebar-content">
        {navigation.map(({ category, items }) => (
          <div key={category} className="docs-nav-section">
            <h4 className="docs-nav-category">{category}</h4>
            <ul className="docs-nav-list">
              {items.map(item => (
                <li key={item.slug}>
                  <Link
                    to={`/docs/${product}/${item.slug}`}
                    className={`docs-nav-link ${currentSlug === item.slug ? 'active' : ''}`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

export default DocsSidebar;
