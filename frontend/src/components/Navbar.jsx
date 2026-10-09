import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sun, Moon, Menu, X, ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Theme state & toggler
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  
  const handleDropdownToggle = (name) => {
    if (activeDropdown === name) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(name);
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo-mark.svg" alt="FlexConvert Logo" className="logo-img-mark" width="36" height="36" />
          <span className="logo-text">
            Flex<span className="logo-accent">Convert</span>
          </span>
          <span className="logo-badge">Pro</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="desktop-nav">
          <div className="nav-item-dropdown" 
               onMouseEnter={() => setActiveDropdown('converters')}
               onMouseLeave={() => setActiveDropdown(null)}>
            <button className={`nav-link-btn ${activeDropdown === 'converters' ? 'active' : ''}`}>
              Convert <ChevronDown size={14} />
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'converters' ? 'show' : ''}`}>
              <NavLink to="/image-converter" className="dropdown-item">
                <span className="dropdown-emoji">🖼️</span>
                <div className="dropdown-info">
                  <strong>Image Converter</strong>
                  <small>Convert PNG, JPG, WebP, SVG, AVIF</small>
                </div>
              </NavLink>
              <NavLink to="/video-converter" className="dropdown-item">
                <span className="dropdown-emoji">🎬</span>
                <div className="dropdown-info">
                  <strong>Video Converter</strong>
                  <small>Convert MP4, MOV, WebM, MKV, AVI</small>
                </div>
              </NavLink>
              <NavLink to="/pdf-converter" className="dropdown-item">
                <span className="dropdown-emoji">📄</span>
                <div className="dropdown-info">
                  <strong>PDF Converter</strong>
                  <small>Convert PDF to Images or Images to PDF</small>
                </div>
              </NavLink>
            </div>
          </div>

          <div className="nav-item-dropdown"
               onMouseEnter={() => setActiveDropdown('tools')}
               onMouseLeave={() => setActiveDropdown(null)}>
            <button className={`nav-link-btn ${activeDropdown === 'tools' ? 'active' : ''}`}>
              Tools <ChevronDown size={14} />
            </button>
            <div className={`dropdown-menu ${activeDropdown === 'tools' ? 'show' : ''}`}>
              <div className="dropdown-item disabled">
                <span className="dropdown-emoji">📦</span>
                <div className="dropdown-info">
                  <strong>Compressor</strong>
                  <small>Reduce file sizes (Coming Soon)</small>
                </div>
              </div>
              <div className="dropdown-item disabled">
                <span className="dropdown-emoji">📐</span>
                <div className="dropdown-info">
                  <strong>Image Resizer</strong>
                  <small>Change width & height (Coming Soon)</small>
                </div>
              </div>
              <div className="dropdown-item disabled">
                <span className="dropdown-emoji">🛠️</span>
                <div className="dropdown-info">
                  <strong>PDF Tools</strong>
                  <small>Merge, Split, Rotate (Coming Soon)</small>
                </div>
              </div>
            </div>
          </div>

          <a href="#faq" className="nav-link">FAQ</a>
          <a href="#features" className="nav-link">Features</a>
        </nav>

        {/* Desktop Actions */}
        <div className="desktop-actions">
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            aria-label="Toggle Dark Mode"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={20} className="theme-icon" /> : <Moon size={20} className="theme-icon" />}
          </button>
          
          <button className="btn btn-secondary btn-sm" onClick={() => alert('Authentication mock: Sign In triggered')}>
            Sign In
          </button>
          <button className="btn btn-primary btn-sm btn-glow" onClick={() => alert('Authentication mock: Get Started triggered')}>
            <Sparkles size={14} /> Get Started
          </button>
        </div>

        {/* Mobile Actions Container */}
        <div className="mobile-actions-wrapper">
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn mobile-theme-toggle"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={toggleMobileMenu} 
            className="mobile-menu-toggle-btn"
            aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          <div className="mobile-nav-section">
            <span className="mobile-nav-title">Converters</span>
            <NavLink to="/image-converter" className="mobile-nav-link" onClick={toggleMobileMenu}>
              🖼️ Image Converter
            </NavLink>
            <NavLink to="/video-converter" className="mobile-nav-link" onClick={toggleMobileMenu}>
              🎬 Video Converter
            </NavLink>
            <NavLink to="/pdf-converter" className="mobile-nav-link" onClick={toggleMobileMenu}>
              📄 PDF Converter
            </NavLink>
          </div>

          <div className="mobile-nav-section">
            <span className="mobile-nav-title">Other Tools</span>
            <div className="mobile-nav-link disabled">📦 Compressor (Soon)</div>
            <div className="mobile-nav-link disabled">📐 Image Resizer (Soon)</div>
            <div className="mobile-nav-link disabled">🛠️ PDF Tools (Soon)</div>
          </div>

          <div className="mobile-nav-section">
            <span className="mobile-nav-title">Support</span>
            <a href="#faq" className="mobile-nav-link" onClick={toggleMobileMenu}>FAQ</a>
            <a href="#features" className="mobile-nav-link" onClick={toggleMobileMenu}>Features</a>
          </div>

          <div className="mobile-nav-buttons">
            <button className="btn btn-secondary" onClick={() => { toggleMobileMenu(); alert('Authentication mock: Sign In'); }}>
              Sign In
            </button>
            <button className="btn btn-primary" onClick={() => { toggleMobileMenu(); alert('Authentication mock: Get Started'); }}>
              Get Started
            </button>
          </div>
        </nav>
      </div>
      
      {mobileMenuOpen && <div className="mobile-overlay" onClick={toggleMobileMenu} />}
    </header>
  );
}
