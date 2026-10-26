import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/skills" element={<MySkills />} />
            <Route path="/goals" element={<CareerGoals />} />
            <Route path="/roadmaps" element={<Roadmaps />} />
            <Route path="/analysis" element={<Analysis />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
