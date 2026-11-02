import { Loader2 } from 'lucide-react';
import { formatCurrency, titleCase } from '../../utils/format';

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'This year' },
];

export function Notice({ error, notice }) {
  return (
    <>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="alert alert-success">{notice}</div>}
    </>
  );
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="admin-loading" role="status" aria-label={label}>
      <Loader2 size={22} className="admin-loading__icon" />
      <span>{label}…</span>
    </div>
  );
}

export function StatGrid({ items }) {
  return (
    <div className="admin__stats">
      {items.map((item) => (
        <article className="card admin__stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value ?? 0}</strong>
          {item.hint && <small>{item.hint}</small>}
        </article>
      ))}
    </div>
  );
}

export function Pager({ meta, onPage }) {
  if (!meta?.totalPages) return null;

  return (
    <div className="admin__pagination">
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} records
      </span>
      <div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onPage(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onPage(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function RangePicker({ value, onChange }) {
  return (
    <label className="admin__range">
      <span>Period</span>
      <select
        className="form-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Bars({
  data = [],
  labelKey,
  valueKey,
  formatValue,
  emptyText = 'No data for this period.',
  dense = false,
}) {
  if (!data.length) {
    return <p className="empty-state">{emptyText}</p>;
  }

  const max = Math.max(1, ...data.map((row) => Number(row[valueKey]) || 0));

  return (
    <div className={`admin__chart ${dense ? 'admin__chart--dense' : ''}`}>
      {data.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        const label = String(row[labelKey] || '');
        return (
          <div className="admin__bar-wrap" key={`${label}-${index}`}>
            <div
              className="admin__bar"
              style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
              title={`${label}: ${
                formatValue ? formatValue(value, row) : value
              }`}
            />
            {!dense && <span>{label.length > 5 ? label.slice(5) : label}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function StatusPill({ status }) {
  const value = String(status || 'unknown');
  return (
    <span className={`admin-pill admin-pill--${value.replace(/_/g, '-')}`}>
      {titleCase(value)}
    </span>
  );
}

export function PlanBadge({ code, name }) {
  return (
    <span className={`admin-pill admin-pill--plan-${code || 'free'}`}>
      {name || titleCase(code || 'free')}
    </span>
  );
}

export function Money({ cents, currency = 'USD' }) {
  return <>{formatCurrency(cents, currency)}</>;
}

export function SectionHeader({ title, hint, children }) {
  return (
    <div className="admin__users-head">
      <h2>{title}</h2>
      <span>{hint}</span>
      {children}
    </div>
  );
}
