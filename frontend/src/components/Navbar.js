import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    isActive ? 'navbar__link navbar__link--active' : 'navbar__link';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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
          type="button"
          className="navbar__toggle"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="public-navigation"
        >
          {menuOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <Menu size={24} aria-hidden="true" />
          )}
        </button>

        <nav
          id="public-navigation"
          className={`navbar__menu ${menuOpen ? 'navbar__menu--open' : ''}`}
          aria-label="Main navigation"
        >
          <NavLink to="/" className={linkClass} onClick={closeMenu} end>
            Home
          </NavLink>
          <NavLink to="/about" className={linkClass} onClick={closeMenu}>
            About
          </NavLink>
          <NavLink to="/pricing" className={linkClass} onClick={closeMenu}>
            Pricing
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
              <Link
                to="/profile"
                className="btn btn-primary btn-sm navbar__workspace"
                onClick={closeMenu}
              >
                <LayoutDashboard size={16} aria-hidden="true" />
                My workspace
              </Link>
              <span className="navbar__user">
                {user.name.split(' ')[0]}
              </span>
              <button
                type="button"
                className="navbar__logout"
                onClick={handleLogout}
              >
                <LogOut size={16} aria-hidden="true" /> Log out
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
                className="btn btn-primary btn-sm navbar__cta"
                onClick={closeMenu}
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
