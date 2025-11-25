import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import BlogPost from './pages/BlogPost'
import About from './pages/About'
import DocsIndex from './pages/DocsIndex'
import DocsProductIndex from './pages/DocsProductIndex'
import DocsPage from './pages/DocsPage'
import './App.css'

function App() {
  return (
    <Router basename="/">
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:slug" element={<BlogPost />} />
            <Route path="/docs" element={<DocsIndex />} />
            <Route path="/docs/:product" element={<DocsProductIndex />} />
            <Route path="/docs/:product/:slug" element={<DocsPage />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
