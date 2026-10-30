import { Link } from 'react-router-dom';
import './StatGrid.css';

function StatGrid({ items, ariaLabel, className = '' }) {
  return (
    <div className={`stat-grid ${className}`.trim()} aria-label={ariaLabel}>
      {items.map(({ label, value, hint, icon: Icon, to }) => {
        const content = (
          <>
            {Icon && (
              <span className="stat-card__icon">
                <Icon size={20} />
              </span>
            )}
            <span className="stat-card__body">
              <small>{label}</small>
              <strong>{value}</strong>
              {hint && <em>{hint}</em>}
            </span>
          </>
        );

        return to ? (
          <Link to={to} className="stat-card" key={label}>
            {content}
          </Link>
        ) : (
          <div className="stat-card" key={label}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default StatGrid;
