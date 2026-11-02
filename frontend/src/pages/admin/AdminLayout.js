import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import '../Admin.css';
import './AdminLayout.css';

const LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/activity', label: 'Activity', icon: Activity },
  { to: '/admin/finance', label: 'Finance', icon: CreditCard },
  { to: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: Building2 },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
  { to: '/admin/operations', label: 'Operations', icon: Building2 },
];

function metaFor(pathname) {
  if (/^\/admin\/users\/\d+/.test(pathname)) {
    return {
      title: 'User detail',
      description:
        'Review a member, their subscription, activity timeline, and administrative actions.',
    };
  }

  switch (pathname) {
    case '/admin/users':
      return {
        title: 'User management',
        description:
          'Search, filter, suspend, reactivate, and manage plans for every account.',
      };
    case '/admin/activity':
      return {
        title: 'Activity monitor',
        description:
          'Watch platform activity as it happens, filtered by category or event.',
      };
    case '/admin/finance':
      return {
        title: 'Financial overview',
        description:
          'Verified revenue, refunds, MRR, plan and provider breakdowns, and transaction trends.',
      };
    case '/admin/transactions':
      return {
        title: 'Transactions',
        description:
          'Inspect payment records across every provider and export filtered results.',
      };
    case '/admin/subscriptions':
      return {
        title: 'Subscriptions',
        description:
          'Track active, expiring, cancelled, and institution subscriptions.',
      };
    case '/admin/analytics':
      return {
        title: 'Platform analytics',
        description:
          'Growth, activation, engagement, feature adoption, and commercial conversion.',
      };
    case '/admin/audit':
      return {
        title: 'Audit log',
        description:
          'An append-only record of administrator actions with before and after values.',
      };
    case '/admin/operations':
      return {
        title: 'Operations',
        description:
          'Send announcements, review upgrade requests, and manage institutions.',
      };
    default:
      return {
        title: 'Control centre',
        description:
          'Live platform health, users, revenue, subscriptions, and administrator activity.',
      };
  }
}

function AdminLayout() {
  const { pathname } = useLocation();
  const meta = metaFor(pathname);

  return (
    <>
      <PageHeader eyebrow="Administration" title={meta.title} description={meta.description} />
      <nav className="admin-nav" aria-label="Admin sections">
        <div className="container admin-nav__inner">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
                }
              >
                <Icon size={16} aria-hidden="true" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
      <section className="section section--soft">
        <div className="container admin-page">
          <Outlet />
        </div>
      </section>
    </>
  );
}

export default AdminLayout;
