import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AppSidebar from '../components/AppSidebar';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';
import './AppLayout.css';

const SIDEBAR_STORAGE_KEY = 'skillbridge:sidebar-collapsed';

function getStoredSidebarState() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getStoredSidebarState);
  const { user } = useAuth();
  const location = useLocation();

  const closeMobileNav = () => setMobileOpen(false);
  const toggleCollapsed = () => setCollapsed((current) => !current);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      return;
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div
      className={`app-layout ${
        collapsed ? 'app-layout--collapsed' : ''
      }`}
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <AppSidebar
        mobileOpen={mobileOpen}
        onClose={closeMobileNav}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {mobileOpen && (
        <button
          type="button"
          className="app-layout__overlay"
          onClick={closeMobileNav}
          aria-label="Close navigation"
        />
      )}

      <div className="app-layout__body">
        <header className="app-layout__mobile-bar">
          <button
            type="button"
            className="app-layout__menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu size={23} aria-hidden="true" />
          </button>

          <Link to="/profile" className="app-layout__mobile-brand">
            <img
              src={`${process.env.PUBLIC_URL}/brand-logo.png`}
              alt=""
              className="app-layout__mobile-logo"
            />
            <span>
              SkillBridge <strong>AI</strong>
            </span>
          </Link>

          <Link
            to="/profile"
            className="app-layout__mobile-avatar"
            aria-label="Open your profile"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="app-layout__mobile-avatar-image"
              />
            ) : (
              getInitials(user)
            )}
          </Link>
        </header>

        <main
          className="app-layout__main"
          id="main-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
