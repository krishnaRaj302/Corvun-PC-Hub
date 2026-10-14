import { Link } from "react-router-dom";
import "./Navbar.css";
function Navbar() {
  return (
    <header className="navbar">

      {/* Logo */}
      <div className="navbar-logo">
        <Link to="/">
          CORVUN
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="navbar-links">

        <Link to="/">Home</Link>

        <Link to="/products">Products</Link>

        <Link to="/brands">Brands</Link>

        <Link to="/deals">Deals</Link>

      </nav>

      {/* Right Side */}
      <div className="navbar-actions">

        <Link to="/wishlist">
          Wishlist
        </Link>

        <Link to="/cart">
          Cart
        </Link>

        <Link to="/login">
          Login
        </Link>

      </div>

    </header>
  );
}

export default Navbar;