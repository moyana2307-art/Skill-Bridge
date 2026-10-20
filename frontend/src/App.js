import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/Home';
import About from './pages/About';
import PlaceholderPage from './pages/PlaceholderPage';

// App holds the routing table.
// PublicLayout wraps every public page with the Navbar and Footer;
// React Router renders the matching page inside it.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/login"
            element={<PlaceholderPage title="Log in" stageNumber={5} />}
          />
          <Route
            path="/register"
            element={
              <PlaceholderPage title="Create your account" stageNumber={5} />
            }
          />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
