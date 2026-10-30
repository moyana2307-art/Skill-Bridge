import './PageHeader.css';

function PageHeader({ icon: Icon, eyebrow, title, description, actions }) {
  return (
    <section className="page-header">
      <div className="container page-header__inner">
        <div className="page-header__text">
          {eyebrow && (
            <span className="badge">
              {Icon && <Icon size={14} aria-hidden="true" />}
              {eyebrow}
            </span>
          )}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </section>
  );
}

export default PageHeader;
