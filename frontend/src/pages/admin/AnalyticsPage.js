import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatCurrency, titleCase } from '../../utils/format';
import {
  Bars,
  Loading,
  Notice,
  RangePicker,
  StatGrid,
} from './adminUi';

function percent(value) {
  return `${Math.round((Number(value) || 0) * 1000) / 10}%`;
}

function AnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    adminApi
      .analytics({ range })
      .then((response) => {
        if (active) setData(response.data.analytics);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load analytics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  if (loading && !data) return <Loading label="Loading analytics" />;

  const users = data?.users || {};
  const business = data?.business || {};
  const features = data?.feature_usage || {};
  const currency = 'USD';

  const stats = [
    { label: 'Total users', value: users.total },
    { label: 'New in period', value: users.new, hint: `Previous ${users.previous_new ?? 0}` },
    { label: 'Active (30d)', value: users.active_30d, hint: percent(users.active_rate_30d) },
    { label: 'Inactive (30d)', value: users.inactive_30d },
    { label: 'Suspended', value: users.suspended },
    { label: 'Active in period', value: users.active_users_in_range },
    { label: 'Returning users', value: users.returning_users_in_range },
    { label: 'Events in period', value: users.events_in_range },
    {
      label: 'Net revenue (period)',
      value: formatCurrency(business.revenue?.net_cents, currency),
      hint: `Previous ${formatCurrency(business.previous_revenue_net_cents, currency)}`,
    },
    { label: 'Paying users', value: business.paying_users },
    { label: 'Paid subscriptions', value: business.paid_active_subscriptions },
    { label: 'Free → premium', value: percent(business.free_to_premium_conversion) },
    {
      label: 'Subscription conversion',
      value: percent(business.subscription_conversion_rate),
    },
    { label: 'Cancellation rate', value: percent(business.cancellation_rate) },
    { label: 'Refund rate', value: percent(business.refund_rate) },
  ];

  const featureItems = [
    ['Career assessments', features.career_assessments],
    ['Mentor messages', features.mentor_messages],
    ['Roadmaps', features.roadmaps],
    ['CVs', features.cvs],
    ['Cover letters', features.cover_letters],
    ['Mock interviews', features.interviews],
    ['Saved opportunities', features.saved_opportunities],
    ['Applications', features.applications],
    ['Projects submitted', features.projects_submitted],
    ['Opportunity views', features.opportunity_views],
  ];

  return (
    <>
      <Notice error={error} />

      <div className="admin-toolbar">
        <RangePicker value={range} onChange={setRange} />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} /> Refresh
        </button>
        <span className="admin__plan-note" style={{ margin: 0 }}>
          {data?.range?.from} to {data?.range?.to}
        </span>
      </div>

      <StatGrid items={stats} />

      <div className="admin-split">
        <article className="card admin-card">
          <h2>
            <BarChart3 size={17} /> Registrations (daily)
          </h2>
          <Bars
            data={data?.registrations?.daily || []}
            labelKey="date"
            valueKey="count"
            formatValue={(value) => `${value} users`}
          />
        </article>

        <article className="card admin-card">
          <h2>
            <BarChart3 size={17} /> Paying users (daily)
          </h2>
          <Bars
            data={data?.paying_user_series || []}
            labelKey="date"
            valueKey="paying_users"
            formatValue={(value) => `${value} paying users`}
          />
        </article>
      </div>

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Registrations (weekly)</h2>
          {data?.registrations?.weekly?.length ? (
            <ul className="admin-rows">
              {data.registrations.weekly.map((row) => (
                <li key={row.date}>
                  <span>Week of {row.date}</span>
                  <span>{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No registrations.</p>
          )}
        </article>

        <article className="card admin-card">
          <h2>Registrations (monthly)</h2>
          {data?.registrations?.monthly?.length ? (
            <ul className="admin-rows">
              {data.registrations.monthly.map((row) => (
                <li key={row.month}>
                  <span>{row.month}</span>
                  <span>{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No registrations.</p>
          )}
        </article>
      </div>

      <article className="card admin-card">
        <h2>Feature usage in period</h2>
        <div className="admin__stats">
          {featureItems.map(([label, value]) => (
            <article className="admin__stat" key={label}>
              <span>{label}</span>
              <strong>{value ?? 0}</strong>
            </article>
          ))}
        </div>
      </article>

      <article className="card admin-card">
        <h2>Definitions</h2>
        <ul className="admin-definitions">
          {data?.definitions &&
            Object.entries(data.definitions).map(([key, value]) => (
              <li key={key}>
                <strong>{titleCase(key)}:</strong> {value}
              </li>
            ))}
        </ul>
      </article>
    </>
  );
}

export default AnalyticsPage;
