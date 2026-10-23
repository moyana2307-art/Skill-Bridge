import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Register() {
  const { user, register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setSubmitting(true);

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      const details = Array.isArray(err.details) ? err.details : [];
      const nextFieldErrors = {};

      details.forEach((issue) => {
        if (issue.field) nextFieldErrors[issue.field] = issue.message;
      });

      setFieldErrors(nextFieldErrors);
      setError(err.message || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth">
      <div className="container">
        <div className="card auth__card">
          <div className="auth__header">
            <div className="auth__icon">
              <UserPlus size={24} />
            </div>
            <h1>Create your account</h1>
            <p>Start with a free account. Your profile is private to you.</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
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

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                maxLength={255}
                required
              />
              {fieldErrors.email && <p className="form-error">{fieldErrors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
              <p className="auth__hint">Use at least 8 characters.</p>
              {fieldErrors.password && (
                <p className="form-error">{fieldErrors.password}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-input"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                maxLength={72}
                required
              />
              {fieldErrors.confirmPassword && (
                <p className="form-error">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth__footer">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default Register;
