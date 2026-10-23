import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wraps pages that require a login. While the cookie is being checked we show
// a spinner; if there is no user we send them to /login and remember where
// they were trying to go.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div className="spinner" role="status" aria-label="Checking your session" />
        </div>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
