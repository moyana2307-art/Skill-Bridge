import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

// Public navigation bar shown on all public pages.
// Uses a hamburger menu on small screens (state controls open/closed).
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const linkClass = ({ isActive }) =>
    isActive ? 'navbar__link navbar__link--active' : 'navbar__link';

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" onClick={closeMenu}>
          <img
            src={`${process.env.PUBLIC_URL}/brand-logo.png`}
            alt="SkillBridge AI logo"
            className="navbar__logo-img"
          />
          <span>
            SkillBridge <span className="navbar__brand-accent">AI</span>
          </span>
        </Link>

        <button
          className="navbar__toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav
          className={`navbar__menu ${menuOpen ? 'navbar__menu--open' : ''}`}
        >
          <NavLink to="/" className={linkClass} onClick={closeMenu} end>
            Home
          </NavLink>
          <NavLink to="/about" className={linkClass} onClick={closeMenu}>
            About
          </NavLink>
          <NavLink to="/login" className={linkClass} onClick={closeMenu}>
            Log in
          </NavLink>
          <Link
            to="/register"
            className="btn btn-primary navbar__cta"
            onClick={closeMenu}
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
