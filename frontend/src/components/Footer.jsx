import { Link } from 'react-router-dom';
import { Globe, MessageSquare, Mail } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-logo">
              <img src="/logo-mark.svg" alt="FlexConvert Logo" className="logo-img-mark" width="34" height="34" />
              <span className="logo-text">FlexConvert</span>
            </Link>
            <p className="footer-description">
              Secure, fast, and modern universal file conversion system. Convert images, videos, documents, and archives without limits.
            </p>
            <div className="footer-socials">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Globe size={18} /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Community"><MessageSquare size={18} /></a>
              <a href="mailto:contact@flexconvert.com" aria-label="Email Support"><Mail size={18} /></a>
            </div>
          </div>

          {/* Links Col 1: Product */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-links-list">
              <li><Link to="/image-converter">Image Converter</Link></li>
              <li><Link to="/video-converter">Video Converter</Link></li>
              <li><span className="disabled-link">Audio Converter <span className="badge-soon">Soon</span></span></li>
              <li><span className="disabled-link">PDF Tools <span className="badge-soon">Soon</span></span></li>
            </ul>
          </div>

          {/* Links Col 2: Resources */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-links-list">
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#formats">Supported Formats</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><span className="disabled-link">API Docs <span className="badge-soon">Soon</span></span></li>
            </ul>
          </div>

          {/* Links Col 3: Legal / Company */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links-list">
              <li><span className="disabled-link">About Us</span></li>
              <li><span className="disabled-link">Contact</span></li>
              <li><span className="disabled-link">Privacy Policy</span></li>
              <li><span className="disabled-link">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            &copy; {currentYear} FlexConvert. All rights reserved.
          </div>
          <div className="footer-meta">
            Powered by NezaWeb.
          </div>
        </div>
      </div>
    </footer>
  );
}
