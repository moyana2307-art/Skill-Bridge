import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/client';
import { formatCurrency, titleCase } from '../../utils/format';
import {
  Bars,
  Loading,
  Notice,
  RangePicker,
  StatGrid,
} from './adminUi';

function Finance() {
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
      .financialOverview({ range })
      .then((response) => {
        if (active) setData(response.data.financial);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load financial data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  if (loading && !data) return <Loading label="Loading financial data" />;

  const currency = data?.currency || 'USD';
  const counts = data?.transaction_counts || {};
  const mix = data?.subscription_mix;
  const totalMix = Math.max(1, mix?.total_users || 0);

  const stats = [
    {
      label: 'Net revenue (lifetime)',
      value: formatCurrency(data?.lifetime?.net_cents, currency),
      hint: `Gross ${formatCurrency(data?.lifetime?.gross_cents, currency)}`,
    },
    {
      label: 'Net revenue (period)',
      value: formatCurrency(data?.selected_range?.net_cents, currency),
      hint: `Refunds ${formatCurrency(data?.selected_range?.refunds_cents, currency)}`,
    },
    { label: 'MRR', value: formatCurrency(data?.mrr_cents, currency) },
    { label: 'ARPPU', value: formatCurrency(data?.arppu_cents, currency) },
    { label: 'Paying users', value: data?.paying_users },
    { label: 'Pending payments', value: counts.pending, hint: formatCurrency(counts.pending_amount_cents, currency) },
    { label: 'Successful', value: counts.successful },
    { label: 'Failed', value: counts.failed },
    { label: 'Refunded', value: counts.refunded },
    { label: 'Disputed', value: counts.disputed },
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
        <Link to="/admin/transactions" className="btn btn-outline btn-sm">
          All transactions <ArrowRight size={14} />
        </Link>
      </div>

      <StatGrid items={stats} />

      <div className="admin-split">
        <article className="card admin-card">
          <h2>
            <CreditCard size={17} /> Daily net revenue
          </h2>
          <Bars
            data={data?.series?.daily || []}
            labelKey="date"
            valueKey="net_cents"
            formatValue={(value) => formatCurrency(value, currency)}
            emptyText="No payments in this period."
          />
        </article>

        <article className="card admin-card">
          <h2>
            <CreditCard size={17} /> Monthly net revenue
          </h2>
          <Bars
            data={data?.series?.monthly || []}
            labelKey="month"
            valueKey="net_cents"
            formatValue={(value) => formatCurrency(value, currency)}
            emptyText="No payments in the last 12 months."
          />
        </article>
      </div>

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Revenue by plan</h2>
          {data?.revenue_by_plan?.length ? (
            <ul className="admin-rows">
              {data.revenue_by_plan.map((row) => (
                <li key={row.plan_code}>
                  <span>
                    <strong>{titleCase(row.plan_code)}</strong>
                    <small>{row.payments} payments</small>
                  </span>
                  <span>{formatCurrency(row.net_cents, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No verified payments.</p>
          )}
        </article>

        <article className="card admin-card">
          <h2>Revenue by provider</h2>
          {data?.revenue_by_provider?.length ? (
            <ul className="admin-rows">
              {data.revenue_by_provider.map((row) => (
                <li key={row.provider}>
                  <span>
                    <strong>{titleCase(row.provider)}</strong>
                    <small>{row.payments} payments</small>
                  </span>
                  <span>{formatCurrency(row.net_cents, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No verified payments.</p>
          )}
        </article>
      </div>

      <div className="admin-split">
        <article className="card admin-card">
          <h2>Subscription mix</h2>
          <ul className="admin-rows">
            <li>
              <span>
                <strong>Free</strong>
                <small>{Math.round(((mix?.free || 0) / totalMix) * 100)}%</small>
              </span>
              <span>{mix?.free || 0}</span>
            </li>
            <li>
              <span>
                <strong>Plus / Premium</strong>
                <small>Active paid</small>
              </span>
              <span>{mix?.premium || 0}</span>
            </li>
            <li>
              <span>
                <strong>Institution</strong>
                <small>Active seats</small>
              </span>
              <span>{mix?.institution || 0}</span>
            </li>
          </ul>
        </article>

        <article className="card admin-card">
          <h2>Subscription movement</h2>
          <Bars
            data={data?.series?.subscriptions || []}
            labelKey="month"
            valueKey="new_count"
            formatValue={(value) => `${value} new`}
            emptyText="No subscription rows yet."
          />
          <p className="admin__plan-note">
            Bars show new Plus/Premium subscriptions per month. Cancellations are
            tracked in the subscription records.
          </p>
        </article>
      </div>

      <article className="card admin-card">
        <h2>How these figures are calculated</h2>
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

export default Finance;
