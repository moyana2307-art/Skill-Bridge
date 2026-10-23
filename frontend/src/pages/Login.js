import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/profile';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // After a successful login the auth context updates `user`, and this
  // redirect sends the person to the page they originally wanted.
  if (user) {
    return <Navigate to={from} replace />;
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
    setSubmitting(true);

    try {
      await login({ email: form.email, password: form.password });
    } catch (err) {
      const details = Array.isArray(err.details) ? err.details : [];
      const nextFieldErrors = {};

      details.forEach((issue) => {
        if (issue.field) nextFieldErrors[issue.field] = issue.message;
      });

      setFieldErrors(nextFieldErrors);
      setError(err.message || 'Unable to log in. Please try again.');
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
              <LogIn size={24} />
            </div>
            <h1>Welcome back</h1>
            <p>Log in to continue building your career plan.</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
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
                autoComplete="current-password"
                maxLength={72}
                required
              />
              {fieldErrors.password && (
                <p className="form-error">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="auth__footer">
            New to SkillBridge AI? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default Login;
