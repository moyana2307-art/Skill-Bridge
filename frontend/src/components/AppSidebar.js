import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Compass,
  LogOut,
  Map,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';
import './AppSidebar.css';

const NAV_GROUPS = [
  {
    label: 'Your space',
    items: [
      { to: '/profile', label: 'Profile', icon: UserRound },
      { to: '/skills', label: 'Skills', icon: Sparkles },
      { to: '/goals', label: 'Career goals', icon: Target },
    ],
  },
  {
    label: 'Plan and grow',
    items: [
      { to: '/analysis', label: 'AI analysis', icon: BrainCircuit },
      { to: '/roadmaps', label: 'Roadmaps', icon: Map },
      { to: '/opportunities', label: 'Opportunities', icon: Compass },
    ],
  },
];

function AppSidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/');
  };

  return (
    <aside
      className={`app-sidebar ${mobileOpen ? 'app-sidebar--open' : ''} ${
        collapsed ? 'app-sidebar--collapsed' : ''
      }`}
      aria-label="Workspace navigation"
    >
      <div className="app-sidebar__top">
        <Link to="/profile" className="app-sidebar__brand" onClick={onClose}>
          <span className="app-sidebar__logo-wrap">
            <img
              src={`${process.env.PUBLIC_URL}/brand-logo.png`}
              alt=""
              className="app-sidebar__logo"
            />
          </span>
          <span className="app-sidebar__brand-text">
            SkillBridge <strong>AI</strong>
          </span>
        </Link>

        <button
          type="button"
          className="app-sidebar__collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          className="app-sidebar__close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <nav className="app-sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div className="app-sidebar__group" key={group.label}>
            <p className="app-sidebar__group-label">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `app-sidebar__link ${
                      isActive ? 'app-sidebar__link--active' : ''
                    }`
                  }
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.9}
                    aria-hidden="true"
                    className="app-sidebar__icon"
                  />
                  <span className="app-sidebar__label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="app-sidebar__footer">
        <Link
          to="/profile"
          className="app-sidebar__user"
          onClick={onClose}
          aria-label={collapsed ? 'Open your profile' : undefined}
        >
          <span className="app-sidebar__avatar" aria-hidden="true">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="app-sidebar__avatar-image"
              />
            ) : (
              getInitials(user)
            )}
          </span>
          <span className="app-sidebar__user-text">
            <strong>{user?.name || 'Your profile'}</strong>
            <span>{user?.role === 'admin' ? 'Administrator' : 'Member'}</span>
          </span>
        </Link>

        <button
          type="button"
          className="app-sidebar__logout"
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          aria-label={collapsed ? 'Log out' : undefined}
        >
          <LogOut size={19} strokeWidth={1.9} aria-hidden="true" />
          <span className="app-sidebar__label">Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
