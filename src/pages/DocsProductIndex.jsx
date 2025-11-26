import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { loadDocPages } from '../data/docPages';
import { DOCS_PRODUCTS } from '../data/docsNav';

/**
 * Redirects /docs/:product to the first doc page
 */
function DocsProductIndex() {
  const { product } = useParams();
  const [firstSlug, setFirstSlug] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!DOCS_PRODUCTS[product]) {
      setLoading(false);
      return;
    }

    loadDocPages(product)
      .then((docs) => {
        if (docs.length > 0) {
          // Get the first doc (sorted by order)
          setFirstSlug(docs[0].slug);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading docs:', error);
        setLoading(false);
      });
  }, [product]);

  if (loading) return null;

  // Invalid product
  if (!DOCS_PRODUCTS[product]) {
    return <Navigate to="/docs" replace />;
  }

  // Redirect to first doc
  if (firstSlug) {
    return <Navigate to={`/docs/${product}/${firstSlug}`} replace />;
  }

  // No docs found, redirect to docs index
  return <Navigate to="/docs" replace />;
}

export default DocsProductIndex;
