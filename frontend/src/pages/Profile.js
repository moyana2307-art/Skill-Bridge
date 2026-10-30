import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiApi, profileApi } from '../api/client';
import { getInitials, prepareAvatarFile } from '../utils/avatar';
import PageHeader from '../components/PageHeader';
import './Profile.css';

const EMPTY_FORM = {
  name: '',
  education_level: '',
  location: '',
  career_interests: '',
  learning_preferences: '',
  work_experience: '',
};

function Profile() {
  const { updateUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarNotice, setAvatarNotice] = useState('');
  const avatarInputRef = useRef(null);
  const [review, setReview] = useState(null);
  const [reviewGeneratedAt, setReviewGeneratedAt] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await profileApi.get();
      const { user, profile } = response.data;

      setAccount(user);
      updateUser(user);
      setForm({
        name: user.name || '',
        education_level: profile.education_level || '',
        location: profile.location || '',
        career_interests: profile.career_interests || '',
        learning_preferences: profile.learning_preferences || '',
        work_experience: profile.work_experience || '',
      });
    } catch (err) {
      setError(err.message || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let active = true;

    aiApi
      .latestProfileReview()
      .then((response) => {
        if (!active) return;
        setReview(response.data.review || null);
        setReviewGeneratedAt(response.data.generated_at || null);
      })
      .catch(() => {
        // A missing review is not an error; the user can generate one.
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setSuccess('');
    setError('');
  };

  const handleAvatarChange = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';

    if (!file) return;

    setAvatarBusy(true);
    setAvatarError('');
    setAvatarNotice('');

    try {
      const preparedFile = await prepareAvatarFile(file);
      const response = await profileApi.uploadAvatar(preparedFile);

      setAccount(response.data.user);
      updateUser(response.data.user);
      setAvatarNotice('Profile picture updated.');
    } catch (err) {
      setAvatarError(err.message || 'Unable to update your profile picture.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!account?.avatar) return;

    setAvatarBusy(true);
    setAvatarError('');
    setAvatarNotice('');

    try {
      const response = await profileApi.removeAvatar();

      setAccount(response.data.user);
      updateUser(response.data.user);
      setAvatarNotice('Profile picture removed.');
    } catch (err) {
      setAvatarError(err.message || 'Unable to remove your profile picture.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    setFieldErrors({});

    try {
      // Empty strings clear optional fields; the backend stores them as null.
      const response = await profileApi.update(form);
      const { user, profile } = response.data;

      setAccount(user);
      updateUser(user);
      setForm({
        name: user.name || '',
        education_level: profile.education_level || '',
        location: profile.location || '',
        career_interests: profile.career_interests || '',
        learning_preferences: profile.learning_preferences || '',
        work_experience: profile.work_experience || '',
      });
      setSuccess('Your profile has been saved.');
    } catch (err) {
      const details = Array.isArray(err.details) ? err.details : [];
      const nextFieldErrors = {};

      details.forEach((issue) => {
        if (issue.field) nextFieldErrors[issue.field] = issue.message;
      });

      setFieldErrors(nextFieldErrors);
      setError(err.message || 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async () => {
    setReviewLoading(true);
    setReviewError('');

    try {
      const response = await aiApi.profileReview();
      setReview(response.data.review);
      setReviewGeneratedAt(response.data.generated_at);
    } catch (err) {
      setReviewError(err.message || 'Unable to review your profile right now.');
    } finally {
      setReviewLoading(false);
    }
  };

  const pageHeader = (
    <PageHeader
      eyebrow="Your account"
      icon={UserRound}
      title="Your profile"
      description="Keep your details up to date so career guidance and opportunity matching fit your situation."
    />
  );

  if (loading) {
    return (
      <div className="profile">
        {pageHeader}
        <section className="section section--soft">
          <div className="container">
            <div className="spinner" role="status" aria-label="Loading your profile" />
          </div>
        </section>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="profile">
        {pageHeader}
        <section className="section section--soft">
          <div className="container profile__narrow">
            <div className="alert alert-error" role="alert">
              {error}
            </div>
            <button type="button" className="btn btn-primary" onClick={loadProfile}>
              Try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="profile">
      {pageHeader}
      <section className="section section--soft">
        <div className="container">
          <div className="profile__grid">
          <form className="card profile__form" onSubmit={handleSubmit} noValidate>
            <h2>Personal details</h2>

            <div className="profile__avatar-row">
              <div className="profile__avatar-preview">
                {account?.avatar ? (
                  <img src={account.avatar} alt={account.name} />
                ) : (
                  <span aria-hidden="true">{getInitials(account)}</span>
                )}
              </div>

              <div className="profile__avatar-copy">
                <h3>Profile picture</h3>
                <p>
                  Add a photo so your workspace feels like yours. JPEG, PNG, or
                  WebP up to 10 MB; we crop it square and compress it before
                  saving.
                </p>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="profile__avatar-input"
                  onChange={handleAvatarChange}
                  tabIndex={-1}
                  aria-hidden="true"
                />

                <div className="profile__avatar-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy}
                  >
                    <Camera size={16} aria-hidden="true" />
                    {avatarBusy
                      ? 'Updating...'
                      : account?.avatar
                      ? 'Change picture'
                      : 'Add picture'}
                  </button>

                  {account?.avatar && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleAvatarRemove}
                      disabled={avatarBusy}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>

                {avatarError && (
                  <p className="form-error" role="alert">
                    {avatarError}
                  </p>
                )}

                {avatarNotice && (
                  <p className="profile__avatar-notice" role="status">
                    {avatarNotice}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success" role="status">
                {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={100}
                required
              />
              {fieldErrors.name && <p className="form-error">{fieldErrors.name}</p>}
            </div>

            <div className="profile__two-columns">
              <div className="form-group">
                <label className="form-label" htmlFor="education_level">
                  Education level
                </label>
                <input
                  id="education_level"
                  name="education_level"
                  type="text"
                  className="form-input"
                  placeholder="e.g. BSc Computer Science"
                  value={form.education_level}
                  onChange={handleChange}
                  maxLength={100}
                />
                {fieldErrors.education_level && (
                  <p className="form-error">{fieldErrors.education_level}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Harare, Zimbabwe"
                  value={form.location}
                  onChange={handleChange}
                  maxLength={100}
                />
                {fieldErrors.location && (
                  <p className="form-error">{fieldErrors.location}</p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="career_interests">
                Career interests
              </label>
              <input
                id="career_interests"
                name="career_interests"
                type="text"
                className="form-input"
                  placeholder="e.g. Frontend development, data analysis"
                  value={form.career_interests}
                  onChange={handleChange}
                  maxLength={500}
                />
              {fieldErrors.career_interests && (
                <p className="form-error">{fieldErrors.career_interests}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="learning_preferences">
                Learning preferences
              </label>
              <input
                id="learning_preferences"
                name="learning_preferences"
                type="text"
                className="form-input"
                  placeholder="e.g. Short projects and video courses"
                  value={form.learning_preferences}
                  onChange={handleChange}
                  maxLength={500}
                />
              {fieldErrors.learning_preferences && (
                <p className="form-error">{fieldErrors.learning_preferences}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="work_experience">
                Work experience
              </label>
              <textarea
                id="work_experience"
                name="work_experience"
                className="form-textarea"
                placeholder="Any jobs, internships, volunteering, or projects you have done."
                value={form.work_experience}
                onChange={handleChange}
                maxLength={2000}
              />
              {fieldErrors.work_experience && (
                <p className="form-error">{fieldErrors.work_experience}</p>
              )}
            </div>

            <div className="profile__actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>

          <aside className="card profile__account">
            <h2>Account</h2>

            <div className="profile__account-row">
              <UserRound size={18} />
              <div>
                <span className="profile__account-label">Name</span>
                <strong>{account?.name}</strong>
              </div>
            </div>

            <div className="profile__account-row">
              <Mail size={18} />
              <div>
                <span className="profile__account-label">Email</span>
                <strong>{account?.email}</strong>
              </div>
            </div>

            <div className="profile__account-row">
              <ShieldCheck size={18} />
              <div>
                <span className="profile__account-label">Role</span>
                <strong>{account?.role}</strong>
              </div>
            </div>

            <p className="profile__privacy">
              Your email and profile are only visible to you. Other users cannot
              access your account details.
            </p>
          </aside>
        </div>

        <section className="card profile__review">
          <div className="profile__review-head">
            <div>
              <h2>
                <Sparkles size={19} /> AI profile review
              </h2>
              <p>
                Get honest feedback on your profile and suggested wording. Save
                your latest edits above before generating a review.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleReview}
              disabled={reviewLoading}
            >
              <Sparkles size={16} />
              {reviewLoading
                ? 'Reviewing...'
                : review
                ? 'Review again'
                : 'Review my profile'}
            </button>
          </div>

          {reviewError && (
            <div className="alert alert-error" role="alert">
              {reviewError}
            </div>
          )}

          {reviewLoading && !review && (
            <div
              className="spinner profile__review-spinner"
              role="status"
              aria-label="Reviewing your profile"
            />
          )}

          {!reviewLoading && !review && !reviewError && (
            <p className="profile__review-empty">
              No review yet. Generate one to see what already stands out and
              what to improve.
            </p>
          )}

          {review && (
            <div className="profile__review-body">
              <div className="profile__review-score">
                <strong>{review.completeness_score ?? '—'}</strong>
                <span>out of 100 completeness</span>
                {reviewGeneratedAt && (
                  <small>
                    Generated{' '}
                    {new Date(reviewGeneratedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </small>
                )}
              </div>

              <div className="profile__review-main">
                {review.summary && <p>{review.summary}</p>}

                {review.strengths?.length > 0 && (
                  <div className="profile__review-section">
                    <h3>What stands out</h3>
                    <ul>
                      {review.strengths.map((item, index) => (
                        <li key={`strength-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.improvements?.length > 0 && (
                  <div className="profile__review-section">
                    <h3>What to improve</h3>
                    <ul>
                      {review.improvements.map((item) => (
                        <li key={`${item.area}-${item.priority}`}>
                          <strong>{item.area}</strong>
                          <span>{item.recommendation}</span>
                          <span
                            className={`profile__priority profile__priority--${item.priority}`}
                          >
                            {item.priority}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.suggested_headline && (
                  <div className="profile__review-section">
                    <h3>Suggested headline</h3>
                    <p className="profile__review-suggestion">
                      {review.suggested_headline}
                    </p>
                  </div>
                )}

                {review.suggested_about && (
                  <div className="profile__review-section">
                    <h3>Suggested about section</h3>
                    <p className="profile__review-suggestion">
                      {review.suggested_about}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        </div>
      </section>
    </div>
  );
}

export default Profile;
