import { useParams, Navigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { loadDocPages, loadDocPage, getDocBySlug } from '../data/docPages';
import { getPrevNextDocs, DOCS_PRODUCTS } from '../data/docsNav';
import DocsSidebar from '../components/DocsSidebar';
import DocsStructuredData from '../components/DocsStructuredData';
import './DocsPage.css';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function CodeBlock({ children, className }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  return (
    <div className="code-block-wrapper">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: '8px' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function DocsPage() {
  const { product, slug } = useParams();
  const [docs, setDocs] = useState([]);
  const [doc, setDoc] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadDocPages(product),
      loadDocPage(product, slug)
    ]).then(([allDocs, markdown]) => {
      setDocs(allDocs);
      const docMeta = getDocBySlug(allDocs, slug);
      setDoc(docMeta);
      setContent(markdown);
      setLoading(false);
    }).catch((error) => {
      console.error('Error loading doc:', error);
      setLoading(false);
    });
  }, [product, slug]);

  if (loading) return null;
  if (!doc || !DOCS_PRODUCTS[product]) return <Navigate to="/docs" replace />;

  const productInfo = DOCS_PRODUCTS[product];
  const { prev, next } = getPrevNextDocs(docs, slug);

  return (
    <div className="docs-layout">
      <DocsStructuredData doc={doc} product={{ key: product, ...productInfo }} content={content} />
      <DocsSidebar product={product} docs={docs} />

      <main className="docs-main">
        <div className="docs-container">
          {/* Breadcrumb */}
          <nav className="docs-breadcrumb">
            <Link to="/docs">Docs</Link>
            <span className="breadcrumb-separator">/</span>
            <Link to={`/docs/${product}`}>{productInfo.name}</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{doc.title}</span>
          </nav>

          {/* Content */}
          <article className="docs-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 id={slugify(String(children))}>{children}</h1>,
                h2: ({ children }) => <h2 id={slugify(String(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slugify(String(children))}>{children}</h3>,
                h4: ({ children }) => <h4 id={slugify(String(children))}>{children}</h4>,
                pre: ({ children }) => {
                  const codeElement = children?.props;
                  if (codeElement) {
                    return <CodeBlock className={codeElement.className}>{codeElement.children}</CodeBlock>;
                  }
                  return <pre>{children}</pre>;
                },
                code: ({ children, className, ...props }) => (
                  <code className={className} {...props}>{children}</code>
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </article>

          {/* Prev/Next Navigation */}
          <nav className="docs-pagination">
            {prev ? (
              <Link to={`/docs/${product}/${prev.slug}`} className="docs-pagination-link prev">
                <span className="pagination-label">Previous</span>
                <span className="pagination-title">{prev.title}</span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link to={`/docs/${product}/${next.slug}`} className="docs-pagination-link next">
                <span className="pagination-label">Next</span>
                <span className="pagination-title">{next.title}</span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </div>
      </main>
    </div>
  );
}

export default DocsPage;
