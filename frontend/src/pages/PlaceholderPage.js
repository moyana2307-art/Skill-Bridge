import { Link } from 'react-router-dom';
import { Compass, Construction } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './PlaceholderPage.css';

// A clearly labelled placeholder page.
// It exists so navigation links work from Stage 2, without pretending
// a feature is finished. Real pages replace these in later stages.
function PlaceholderPage({ title, stageNumber, message }) {
  const defaultMessage = stageNumber
    ? `This page will be built in Stage ${stageNumber}. It is a placeholder so that navigation works from the start.`
    : 'The page you are looking for does not exist.';

  return (
    <div className="placeholder">
      <PageHeader
        eyebrow="SkillBridge AI"
        icon={Compass}
        title={title}
        description={message || defaultMessage}
      />

      <section className="section section--soft">
        <div className="container">
          <div className="card placeholder__card">
            <span className="placeholder__icon">
              <Construction size={28} aria-hidden="true" />
            </span>
            <h2>Nothing here yet</h2>
            <p>
              This page is still being prepared. In the meantime, you can head
              back home or browse live opportunities.
            </p>
            <div className="placeholder__actions">
              <Link to="/" className="btn btn-primary">
                Back to home
              </Link>
              <Link to="/opportunities" className="btn btn-outline">
                Browse opportunities
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PlaceholderPage;
