import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const passwordDescription = [
    'register-password-hint',
    fieldErrors.password ? 'register-password-error' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AuthShell
      variant="register"
      title="Create your account"
      description="Start with a free account. Your profile is private to you."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
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
            aria-invalid={fieldErrors.name ? 'true' : 'false'}
            aria-describedby={
              fieldErrors.name ? 'register-name-error' : undefined
            }
            required
          />
          {fieldErrors.name && (
            <p className="form-error" id="register-name-error">
              {fieldErrors.name}
            </p>
          )}
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
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            maxLength={255}
            aria-invalid={fieldErrors.email ? 'true' : 'false'}
            aria-describedby={
              fieldErrors.email ? 'register-email-error' : undefined
            }
            required
          />
          {fieldErrors.email && (
            <p className="form-error" id="register-email-error">
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
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={passwordDescription}
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
          <p className="auth__hint" id="register-password-hint">
            Use at least 8 characters.
          </p>
          {fieldErrors.password && (
            <p className="form-error" id="register-password-error">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <div className="auth-field">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-input"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? 'register-confirm-password-error'
                  : undefined
              }
              required
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
              aria-pressed={showConfirmPassword}
              aria-controls="confirmPassword"
            >
              {showConfirmPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="form-error" id="register-confirm-password-error">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg btn-block auth__submit"
          disabled={submitting}
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}

export default Register;
