import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <AuthShell
      variant="login"
      title="Welcome back"
      description="Log in to continue building your career plan, roadmap, and opportunities."
      footer={
        <>
          New to SkillBridge AI? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
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
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            maxLength={255}
            aria-invalid={fieldErrors.email ? 'true' : 'false'}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            required
          />
          {fieldErrors.email && (
            <p className="form-error" id="login-email-error">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <div className="auth-field">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              maxLength={72}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={
                fieldErrors.password ? 'login-password-error' : undefined
              }
              required
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="password"
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="form-error" id="login-password-error">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block auth__submit"
          disabled={submitting}
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
