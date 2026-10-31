import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { subscriptionsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import './Pricing.css';

function formatPrice(cents, currency = 'USD', interval = 'month') {
  if (!cents) return 'Free';
  const value = (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
  return interval === 'month' ? `${value}/mo` : value;
}

function Pricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    subscriptionsApi
      .plans()
      .then((response) => {
        setPlans(response.data.plans || []);
        setPackages(response.data.institution_packages || []);
      })
      .catch((err) => setError(err.message || 'Unable to load plans.'))
      .finally(() => setLoading(false));
  }, []);

  const consumerPlans = plans.filter((plan) => plan.code !== 'institution');

  return (
    <div className="pricing">
      <PageHeader
        eyebrow="Simple, student-friendly pricing"
        icon={Sparkles}
        title="Start free. Upgrade when you are ready to go further."
        description="Build your profile, explore careers, and create one roadmap for free. Upgrade for the AI mentor, CV builder, interview practice, and advanced analytics."
        actions={
          <>
            {user ? (
              <Link to="/billing" className="btn btn-primary">
                Manage your plan <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary">
                Create a free account <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
            <a href="#institutions" className="btn btn-outline">
              <Building2 size={18} aria-hidden="true" /> For institutions
            </a>
          </>
        }
      />

      <section className="section section--soft">
        <div className="container">
          {loading && (
            <div className="spinner" role="status" aria-label="Loading plans" />
          )}
          {error && <div className="alert alert-error">{error}</div>}

          {!loading && !error && (
            <>
              <div className="pricing__plans">
                {consumerPlans.map((plan) => (
                  <article
                    key={plan.code}
                    className={`card pricing__plan ${
                      plan.recommended ? 'pricing__plan--featured' : ''
                    }`}
                  >
                    {plan.recommended && (
                      <span className="pricing__ribbon">Most popular</span>
                    )}
                    <header>
                      <span className="pricing__plan-icon">
                        {plan.code === 'premium' ? (
                          <Crown size={20} aria-hidden="true" />
                        ) : plan.code === 'plus' ? (
                          <Sparkles size={20} aria-hidden="true" />
                        ) : (
                          <GraduationCap size={20} aria-hidden="true" />
                        )}
                      </span>
                      <h2>{plan.name}</h2>
                      <p>{plan.description}</p>
                    </header>
                    <div className="pricing__price">
                      {formatPrice(
                        plan.price_cents,
                        plan.currency,
                        plan.billing_interval
                      )}
                    </div>
                    <ul className="pricing__features">
                      {(plan.feature_list || []).map((feature) => (
                        <li key={feature}>
                          <Check size={16} aria-hidden="true" /> {feature}
                        </li>
                      ))}
                    </ul>
                    {plan.code === 'free' ? (
                      <Link
                        to={user ? '/dashboard' : '/register'}
                        className="btn btn-outline btn-block"
                      >
                        {user ? 'Go to dashboard' : 'Start free'}
                      </Link>
                    ) : (
                      <Link
                        to={user ? '/billing' : '/register'}
                        className="btn btn-primary btn-block"
                      >
                        {user ? `Choose ${plan.name}` : 'Get started'}
                      </Link>
                    )}
                  </article>
                ))}
              </div>

              <article className="card pricing__note">
                <strong>No payment is taken online yet.</strong>
                <p>
                  Submit an upgrade request from your billing page and an
                  administrator will activate the plan after confirming payment
                  details with you.
                </p>
              </article>
            </>
          )}
        </div>
      </section>

      <section className="section pricing__institutions" id="institutions">
        <div className="container">
          <div className="pricing__section-head">
            <span className="badge">
              <Building2 size={14} aria-hidden="true" /> Institutions
            </span>
            <h2>Give every student the same career advantage</h2>
            <p>
              Universities, colleges, NGOs, and training providers can assign
              premium access in bulk and track student progress from one
              dashboard.
            </p>
          </div>

          <div className="pricing__packages">
            {packages.map((pack) => (
              <article className="card pricing__package" key={pack.code}>
                <h3>{pack.name}</h3>
                <div className="pricing__package-price">
                  {formatPrice(pack.price_cents, 'USD', 'month')}
                </div>
                <p>{pack.seat_limit} student seats included</p>
                <ul className="pricing__features">
                  <li>
                    <Check size={16} aria-hidden="true" /> Bulk member management
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Student progress
                    dashboard
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> All Premium features
                    for students
                  </li>
                </ul>
                <Link
                  to={user ? '/institution' : '/register'}
                  className="btn btn-outline btn-block"
                >
                  {user ? 'Set up an institution' : 'Register to get started'}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Pricing;
