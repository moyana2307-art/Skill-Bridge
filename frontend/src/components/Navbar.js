import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

// Main navigation bar. It changes its account links depending on whether
// somebody is logged in. It uses a hamburger menu on small screens.
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/');
  };

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
          <NavLink
            to="/opportunities"
            className={linkClass}
            onClick={closeMenu}
          >
            Opportunities
          </NavLink>

          {!loading && user && (
            <>
              <NavLink to="/goals" className={linkClass} onClick={closeMenu}>
                Goals
              </NavLink>
              <NavLink to="/roadmaps" className={linkClass} onClick={closeMenu}>
                Roadmaps
              </NavLink>
              <NavLink to="/skills" className={linkClass} onClick={closeMenu}>
                My Skills
              </NavLink>
              <NavLink to="/profile" className={linkClass} onClick={closeMenu}>
                Profile
              </NavLink>
              <span className="navbar__user">Hi, {user.name.split(' ')[0]}</span>
              <button
                type="button"
                className="navbar__logout"
                onClick={handleLogout}
              >
                <LogOut size={16} /> Log out
              </button>
            </>
          )}

          {!loading && !user && (
            <>
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
