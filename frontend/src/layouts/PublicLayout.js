import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Shared layout for public pages.
// React Router renders the matching page ("child route") inside <Outlet />,
// so Navbar and Footer only need to be written once.
function PublicLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PublicLayout;
