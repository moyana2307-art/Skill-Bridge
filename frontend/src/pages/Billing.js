import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Crown,
  Sparkles,
} from 'lucide-react';
import { paymentsApi, subscriptionsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';
import PageHeader from '../components/PageHeader';
import './Billing.css';

function formatPrice(cents, currency = 'USD', interval = 'month') {
  if (!cents) return 'Free';
  const value = (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
  return interval === 'month' ? `${value}/mo` : value;
}

const USAGE_ORDER = [
  'career_assessments_per_month',
  'career_recommendations_per_month',
  'skills_gap_analyses_per_month',
  'ai_roadmaps_per_month',
  'active_roadmaps',
  'mentor_messages_per_month',
  'cv_generations_per_month',
  'cover_letters_per_month',
  'mock_interviews_per_month',
  'project_ideas_per_month',
  'project_evaluations_per_month',
  'ai_analyses_per_month',
];

function Billing() {
  const { refreshEntitlements } = useAuth();
  const [searchParams] = useSearchParams();
  const [entitlements, setEntitlements] = useState(null);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [paynowAvailable, setPaynowAvailable] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const returnReference = searchParams.get('reference');

  const load = useCallback(async () => {
    const [meResponse, plansResponse, requestsResponse] = await Promise.all([
      subscriptionsApi.me(),
      subscriptionsApi.plans(),
      subscriptionsApi.requests(),
    ]);
    setEntitlements(meResponse.data.entitlements);
    setPlans(plansResponse.data.plans || []);
    setRequests(requestsResponse.data.requests || []);
    return meResponse.data.entitlements;
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message || 'Unable to load billing details.'))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    let active = true;
    paymentsApi
      .providers()
      .then((response) => {
        if (!active) return;
        const provider = (response.data.providers || []).find(
          (item) => item.name === 'paynow'
        );
        setPaynowAvailable(Boolean(provider?.available));
      })
      .catch(() => {
        if (active) setPaynowAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!returnReference) return undefined;

    let cancelled = false;
    let attempts = 0;
    let timer = null;

    const check = async () => {
      if (cancelled) return;
      try {
        const response = await paymentsApi.status(returnReference);
        if (response.data.payment?.status === 'paid') {
          await refreshEntitlements();
          await load();
          if (!cancelled) {
            setNotice('Payment received. Your plan is now active.');
          }
          return;
        }
      } catch {
        // The webhook may still be in flight; retry below.
      }
      attempts += 1;
      if (!cancelled && attempts < 5) {
        timer = setTimeout(check, 2000);
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [returnReference, load, refreshEntitlements]);

  const handlePaynow = async (planCode) => {
    setSubmitting(planCode);
    setError('');
    setNotice('');
    try {
      const response = await paymentsApi.checkout({ plan_code: planCode });
      const checkout = response.data;
      const form = document.createElement('form');
      form.method = checkout.method || 'POST';
      form.action = checkout.checkoutUrl;
      form.style.display = 'none';
      Object.entries(checkout.fields || {}).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      setNotice('Redirecting you to Paynow...');
      form.submit();
    } catch (err) {
      setError(err.message || 'Unable to start the Paynow checkout.');
      setSubmitting('');
    }
  };

  const handleRequest = async (planCode) => {
    setSubmitting(planCode);
    setError('');
    setNotice('');
    try {
      await subscriptionsApi.requestUpgrade({
        plan_code: planCode,
        note: note.trim() || undefined,
      });
      await load();
      await refreshEntitlements();
      setNote('');
      setNotice('Your upgrade request was sent. An administrator will review it.');
    } catch (err) {
      setError(err.message || 'Unable to send that upgrade request.');
    } finally {
      setSubmitting('');
    }
  };

  const currentPlan = entitlements?.plan;
  const pendingRequest = requests.find((request) => request.status === 'pending');
  const upgrades = plans
    .filter(
      (plan) =>
        plan.code !== 'institution' &&
        plan.code !== 'free' &&
        (!currentPlan || plan.rank > currentPlan.rank)
    )
    .sort((a, b) => a.rank - b.rank);

  const usageRows = [];
  if (entitlements) {
    const seen = new Set();
    Object.values(entitlements.features).forEach((feature) => {
      if (!feature.limit_key || seen.has(feature.limit_key)) return;
      seen.add(feature.limit_key);
      usageRows.push(feature);
    });
    usageRows.sort(
      (a, b) =>
        USAGE_ORDER.indexOf(a.limit_key) - USAGE_ORDER.indexOf(b.limit_key)
    );
  }

  return (
    <div className="billing">
      <PageHeader
        eyebrow="Plans and billing"
        icon={CreditCard}
        title="Your plan and usage"
        description="See what is included, track monthly limits, and upgrade securely with Paynow or a manual request."
        actions={
          <Link to="/pricing" className="btn btn-outline">
            Compare plans <ArrowRight size={16} />
          </Link>
        }
      />

      <section className="section section--soft">
        <div className="container">
          {loading && <div className="spinner" role="status" aria-label="Loading billing" />}
          {error && <div className="alert alert-error">{error}</div>}
          {notice && <div className="alert alert-success">{notice}</div>}

          {!loading && entitlements && (
            <>
              <div className="billing__top">
                <article className="card billing__current">
                  <span className="billing__eyebrow">Current plan</span>
                  <div className="billing__plan-name">
                    {currentPlan.code === 'premium' ? (
                      <Crown size={24} />
                    ) : currentPlan.code === 'plus' ? (
                      <Sparkles size={24} />
                    ) : (
                      <BadgeCheck size={24} />
                    )}
                    {currentPlan.name}
                  </div>
                  <p>{currentPlan.description}</p>
                  <div className="billing__price">
                    {formatPrice(
                      currentPlan.price_cents,
                      currentPlan.currency,
                      currentPlan.billing_interval
                    )}
                  </div>

                  {entitlements.subscription?.source === 'institution' && (
                    <p className="billing__institution">
                      <Building2 size={15} /> Provided by{' '}
                      {entitlements.subscription.institution_name || 'your institution'}
                    </p>
                  )}

                  {entitlements.subscription?.current_period_end && (
                    <p className="billing__renewal">
                      Access until {formatDate(entitlements.subscription.current_period_end)}
                    </p>
                  )}

                  {currentPlan.code === 'free' && (
                    <Link to="/pricing" className="btn btn-primary">
                      See upgrade options <ArrowRight size={16} />
                    </Link>
                  )}
                </article>

                <article className="card billing__usage">
                  <h2>Monthly usage</h2>
                  <p className="billing__usage-note">
                    Limits reset at the start of each calendar month. Active
                    roadmaps are counted across your plan, not per month.
                  </p>
                  <div className="billing__usage-list">
                    {usageRows.map((feature) => {
                      const percent =
                        feature.limit > 0
                          ? Math.min(100, Math.round((feature.used / feature.limit) * 100))
                          : 0;
                      const scope =
                        feature.limit_key === 'active_roadmaps' ? 'active' : 'this month';
                      return (
                        <div className="billing__usage-row" key={feature.limit_key}>
                          <div>
                            <span>{feature.label}</span>
                            <small>
                              {feature.used} of {feature.limit} {scope}
                            </small>
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${
                                percent >= 100 ? 'billing__usage-full' : ''
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <strong>{feature.remaining}</strong>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>

              {pendingRequest ? (
                <article className="card billing__pending">
                  <h2>
                    <Sparkles size={18} /> Upgrade request pending
                  </h2>
                  <p>
                    You requested <strong>{pendingRequest.plan_name}</strong> on{' '}
                    {formatDate(pendingRequest.created_at)}. An administrator will
                    review it soon.
                  </p>
                  {pendingRequest.note && (
                    <p className="billing__pending-note">Your note: {pendingRequest.note}</p>
                  )}
                </article>
              ) : upgrades.length ? (
                <article className="card billing__upgrade">
                  <h2>Upgrade your plan</h2>
                  <p>
                    {paynowAvailable
                      ? 'Pay securely with Paynow using EcoCash, OneMoney, Zimswitch, or a card. You can also send a manual request for an administrator to review.'
                      : 'Choose a plan and add an optional note for the administrator. You will be notified when it is reviewed.'}
                  </p>
                  <div className="form-group">
                    <label className="form-label" htmlFor="billing-note">
                      Note (optional)
                    </label>
                    <textarea
                      id="billing-note"
                      className="form-textarea"
                      rows={3}
                      maxLength={1000}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Tell us how you plan to pay, or ask a question."
                    />
                  </div>
                  <div className="billing__upgrade-options">
                    {upgrades.map((plan) => (
                      <div className="billing__upgrade-option" key={plan.code}>
                        <div>
                          <strong>{plan.name}</strong>
                          <span>
                            {formatPrice(plan.price_cents, plan.currency, plan.billing_interval)}
                          </span>
                        </div>
                        <div className="billing__upgrade-actions">
                          {paynowAvailable && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handlePaynow(plan.code)}
                              disabled={Boolean(submitting)}
                            >
                              {submitting === plan.code
                                ? 'Opening Paynow...'
                                : 'Pay with Paynow'}
                            </button>
                          )}
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              paynowAvailable ? 'btn-outline' : 'btn-primary'
                            }`}
                            onClick={() => handleRequest(plan.code)}
                            disabled={Boolean(submitting)}
                          >
                            {submitting === plan.code && !paynowAvailable
                              ? 'Sending...'
                              : 'Request manual upgrade'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {requests.length > 0 && (
                <article className="card billing__history">
                  <h2>Request history</h2>
                  <ul>
                    {requests.map((request) => (
                      <li key={request.id}>
                        <div>
                          <strong>{request.plan_name}</strong>
                          <small>{formatDate(request.created_at)}</small>
                        </div>
                        <span className={`status-badge status-badge--${request.status}`}>
                          {request.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Billing;
