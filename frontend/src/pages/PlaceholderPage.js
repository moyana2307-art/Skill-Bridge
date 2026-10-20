import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import './PlaceholderPage.css';

// A clearly labelled placeholder page.
// It exists so navigation links work from Stage 2, without pretending
// a feature is finished. Real pages replace these in later stages.
function PlaceholderPage({ title, stageNumber, message }) {
  const defaultMessage = stageNumber
    ? `This page will be built in Stage ${stageNumber}. It is a placeholder so that navigation works from the start.`
    : 'The page you are looking for does not exist.';

  return (
    <section className="section">
      <div className="container">
        <div className="card placeholder__card">
          <Construction size={40} className="placeholder__icon" />
          <h1>{title}</h1>
          <p>{message || defaultMessage}</p>
          <Link to="/" className="btn btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}

export default PlaceholderPage;
