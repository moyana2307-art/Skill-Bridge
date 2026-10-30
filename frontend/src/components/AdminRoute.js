import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageHeader from './PageHeader';

function AdminRoute({ children }) {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <>
        <PageHeader
          eyebrow="Admin"
          title="Administrator access only"
          description="This area is limited to platform administrators."
        />
        <section className="section">
          <div className="container">
            <div className="card">
              <p>You do not have permission to view this page.</p>
              <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return children;
}

export default AdminRoute;
