import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  ArrowRight,
  CreditCard,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react';
import { adminApi } from '../../api/client';
import {
  formatCurrency,
  formatDate,
  formatRelative,
  titleCase,
} from '../../utils/format';
import { Bars, Loading, Notice, StatGrid, StatusPill } from './adminUi';

function Overview() {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      adminApi.dashboard(),
      adminApi.analytics({ range: '30d' }),
      adminApi.financialOverview({ range: '30d' }),
      adminApi.activity({ page: 1, limit: 8 }),
    ])
      .then(([dashboardResponse, analyticsResponse, financeResponse, activityResponse]) => {
        if (!active) return;
        setDashboard(dashboardResponse.data.dashboard);
        setAnalytics(analyticsResponse.data.analytics);
        setFinancial(financeResponse.data.financial);
        setActivity(activityResponse.data.activity || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load the control centre.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loading label="Loading control centre" />;

  const currency = financial?.currency || dashboard?.revenue?.currency || 'USD';
  const users = analytics?.users || {};
  const business = analytics?.business || {};
  const features = analytics?.feature_usage || {};

  const stats = [
    { label: 'Total users', value: dashboard?.users?.total, hint: `${dashboard?.users?.admins ?? 0} admins` },
    { label: 'Active (30 days)', value: dashboard?.users?.active_last_30_days },
    { label: 'New this month', value: dashboard?.users?.new_this_month },
    { label: 'Suspended', value: dashboard?.users?.suspended },
    { label: 'Paying users', value: financial?.paying_users },
    {
      label: 'MRR',
      value: formatCurrency(financial?.mrr_cents, currency),
      hint: 'Monthly recurring',
    },
    {
      label: 'Net revenue (30d)',
      value: formatCurrency(financial?.selected_range?.net_cents, currency),
      hint: 'After refunds',
    },
    {
      label: 'Paid subscriptions',
      value: business?.paid_active_subscriptions,
    },
    {
      label: 'Free → premium',
      value: `${Math.round((business?.free_to_premium_conversion || 0) * 100)}%`,
      hint: 'Active paid / users',
    },
    { label: 'Events (30d)', value: users?.events_in_range },
    {
      label: 'Assessments (30d)',
      value: features?.career_assessments,
    },
    {
      label: 'Opportunity views (30d)',
      value: features?.opportunity_views,
    },
  ];

  const mix = financial?.subscription_mix;
  const totalMix = Math.max(1, mix?.total_users || 0);

  return (
    <>
      <Notice error={error} />

      <StatGrid items={stats} />

      <div className="admin-split">
        <article className="admin-card card">
          <h2>
            <TrendingUp size={17} /> New users
          </h2>
          <Bars
            data={analytics?.registrations?.daily || []}
            labelKey="date"
            valueKey="count"
            formatValue={(value) => `${value} users`}
          />
        </article>

        <article className="admin-card card">
          <h2>
            <CreditCard size={17} /> Net revenue
          </h2>
          <Bars
            data={financial?.series?.daily || []}
            labelKey="date"
            valueKey="net_cents"
            formatValue={(value) => formatCurrency(value, currency)}
          />
        </article>
      </div>

      <div className="admin-split">
        <article className="admin-card card">
          <h2>
            <UsersIcon size={17} /> Subscription mix
          </h2>
          <ul className="admin-rows">
            <li>
              <span>
                <strong>Free</strong>
                <small>{Math.round(((mix?.free || 0) / totalMix) * 100)}% of accounts</small>
              </span>
              <span>{mix?.free || 0}</span>
            </li>
            <li>
              <span>
                <strong>Plus / Premium</strong>
                <small>Active paid subscriptions</small>
              </span>
              <span>{mix?.premium || 0}</span>
            </li>
            <li>
              <span>
                <strong>Institution</strong>
                <small>Active institution seats</small>
              </span>
              <span>{mix?.institution || 0}</span>
            </li>
            <li>
              <span>
                <strong>Pending requests</strong>
                <small>Awaiting review</small>
              </span>
              <span>{dashboard?.subscriptions?.pending_requests || 0}</span>
            </li>
          </ul>
          <Link to="/admin/operations" className="admin-inline-link">
            Review operations <ArrowRight size={13} />
          </Link>
        </article>

        <article className="admin-card card">
          <h2>
            <CreditCard size={17} /> Revenue by plan
          </h2>
          {financial?.revenue_by_plan?.length ? (
            <ul className="admin-rows">
              {financial.revenue_by_plan.map((row) => (
                <li key={row.plan_code}>
                  <span>
                    <strong>{titleCase(row.plan_code)}</strong>
                    <small>{row.payments} successful payments</small>
                  </span>
                  <span>{formatCurrency(row.net_cents, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No verified payments yet.</p>
          )}
          <Link to="/admin/finance" className="admin-inline-link">
            Open finance <ArrowRight size={13} />
          </Link>
        </article>
      </div>

      <div className="admin-split">
        <article className="admin-card card">
          <h2>
            <UsersIcon size={17} /> Recent users
          </h2>
          <div className="admin__table-wrap">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.recent_users || []).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{titleCase(user.role)}</td>
                    <td>
                      <StatusPill status={user.status} />
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/admin/users" className="admin-inline-link">
            Manage users <ArrowRight size={13} />
          </Link>
        </article>

        <article className="admin-card card">
          <h2>
            <ActivityIcon size={17} /> Latest activity
          </h2>
          {activity.length ? (
            <ul className="admin__activity-list">
              {activity.map((item) => (
                <li className="admin__activity-item" key={item.id}>
                  <span className="admin__activity-dot" aria-hidden="true" />
                  <div className="admin__activity-main">
                    <strong>{item.title || titleCase(item.event_type)}</strong>
                    <small>
                      {item.user_name || item.user_email || 'Anonymous'} ·{' '}
                      {formatRelative(item.created_at)}
                    </small>
                  </div>
                  <span className="admin__activity-type">
                    {item.event_type}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No activity recorded yet.</p>
          )}
          <Link to="/admin/activity" className="admin-inline-link">
            Open activity monitor <ArrowRight size={13} />
          </Link>
        </article>
      </div>
    </>
  );
}

export default Overview;
