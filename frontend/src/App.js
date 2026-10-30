import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import MySkills from './pages/MySkills';
import CareerGoals from './pages/CareerGoals';
import Roadmaps from './pages/Roadmaps';
import Analysis from './pages/Analysis';
import Opportunities from './pages/Opportunities';
import Dashboard from './pages/Dashboard';
import CareerIntelligence from './pages/CareerIntelligence';
import Mentor from './pages/Mentor';
import Applications from './pages/Applications';
import CareerStudio from './pages/CareerStudio';
import Projects from './pages/Projects';
import PublicPortfolio from './pages/PublicPortfolio';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Pricing from './pages/Pricing';
import Billing from './pages/Billing';
import Institution from './pages/Institution';
import PlaceholderPage from './pages/PlaceholderPage';

// App holds the routing table.
// AuthProvider checks the login cookie once and makes the current user
// available to the navbar and pages.
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/portfolio/:slug" element={<PublicPortfolio />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Page not found"
                  message="The page you are looking for does not exist or may have moved."
                />
              }
            />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/skills" element={<MySkills />} />
            <Route path="/goals" element={<CareerGoals />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/career" element={<CareerIntelligence />} />
            <Route path="/roadmaps" element={<Roadmaps />} />
            <Route path="/mentor" element={<Mentor />} />
            <Route path="/career-studio" element={<CareerStudio />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/institution" element={<Institution />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
