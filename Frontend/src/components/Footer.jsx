import { Link } from "react-router-dom";
import { CorvunLogo } from "./Navbar";
import "./Footer.css";

function Footer() {
  return (
    <footer className="corvun-footer">
      <div className="footer-main-grid">
        {/* Brand Column */}
        <div className="footer-brand-column">
          <Link to="/" className="footer-brand-link">
            <CorvunLogo />
            <div className="footer-brand-col">
              <span className="footer-brand-title">CORVUN</span>
            </div>
          </Link>

          <p className="footer-mission-text">
            Engineering high-octane custom PC architecture for esports competitors, creators, and computational power users. Monolithic precision, uncompromised thermal flow.
          </p>

          <div className="footer-social-row">
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Discord">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="YouTube">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Twitter">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

        {/* SHOP Column */}
        <div className="footer-column">
          <h4 className="footer-column-title">SHOP</h4>
          <ul className="footer-link-list">
            <li><Link to="/products">All Components</Link></li>
            <li><Link to="/pc-builder">Pre-Built PCs</Link></li>
            <li><Link to="/pc-builder">PC Builder</Link></li>
            <li><Link to="/products?sort=price_low">Deals</Link></li>
            <li><Link to="/products?sort=newest">New Arrivals</Link></li>
            <li><Link to="/products">Best Sellers</Link></li>
          </ul>
        </div>

        {/* SUPPORT Column */}
        <div className="footer-column">
          <h4 className="footer-column-title">SUPPORT</h4>
          <ul className="footer-link-list">
            <li><Link to="/support">Help Center</Link></li>
            <li><Link to="/support">Shipping Information</Link></li>
            <li><Link to="/support">Returns & Refunds</Link></li>
            <li><Link to="/support">Warranty</Link></li>
            <li><Link to="/orders">Track Order</Link></li>
            <li><Link to="/support">Contact Us</Link></li>
          </ul>
        </div>

        {/* COMPANY Column */}
        <div className="footer-column">
          <h4 className="footer-column-title">COMPANY</h4>
          <ul className="footer-link-list">
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/careers">Careers</Link></li>
            <li><Link to="/press">Press & Media</Link></li>
            <li><Link to="/community">Community</Link></li>
            <li><Link to="/terms">Terms & Conditions</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-inner">
          <div className="footer-payment-methods">
            <span className="payment-label">PAYMENT METHODS:</span>
            <span className="payment-pill">VISA</span>
            <span className="payment-pill">Mastercard</span>
            <span className="payment-pill">UPI</span>
            <span className="payment-pill">PayPal</span>
            <span className="payment-pill secure-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              100% Secure Payments
            </span>
          </div>

          <p className="copyright-text">
            © 2026 Corvun. All rights reserved. Builds A Better Tomorrow.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
