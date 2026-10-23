import { useCallback, useEffect, useState } from 'react';
import { Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/client';
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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setSuccess('');
    setError('');
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

  if (loading) {
    return (
      <section className="section section--soft">
        <div className="container">
          <div className="spinner" role="status" aria-label="Loading your profile" />
        </div>
      </section>
    );
  }

  if (error && !account) {
    return (
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
    );
  }

  return (
    <section className="section section--soft">
      <div className="container">
        <div className="profile__header">
          <div>
            <span className="badge">Your account</span>
            <h1>Your profile</h1>
            <p>
              Keep your details up to date so career guidance and opportunity
              matching fit your situation.
            </p>
          </div>
        </div>

        <div className="profile__grid">
          <form className="card profile__form" onSubmit={handleSubmit} noValidate>
            <h2>Personal details</h2>

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
      </div>
    </section>
  );
}

export default Profile;
