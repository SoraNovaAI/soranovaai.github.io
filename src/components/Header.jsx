import { Link } from 'react-router-dom'
import logoSvg from '../assets/logo.svg'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <img src={logoSvg} alt="SoraNova" className="logo-image" />
          <span className="tagline">Tech & Open Source</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Blog</Link>
          <Link to="/about" className="nav-link">About</Link>
          <a href="https://github.com/soranovaai" target="_blank" rel="noopener noreferrer" className="nav-link">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

export default Header
