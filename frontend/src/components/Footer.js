import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import './Footer.css';

// Public footer shown on all public pages.
function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__about">
          <div className="footer__brand">
            <GraduationCap size={24} />
            <span>
              SkillBridge <span className="footer__brand-accent">AI</span>
            </span>
          </div>
          <p>
            Helping students, graduates and self-learners in Zimbabwe connect
            skill development with real career opportunities.
          </p>
          <p className="footer__disclaimer">
            AI-generated guidance is educational advice, not a guarantee of
            employment, scholarship admission, or course completion.
          </p>
        </div>

        <div className="footer__column">
          <h4>Explore</h4>
          <Link to="/">Home</Link>
          <Link to="/about">About SkillBridge AI</Link>
        </div>

        <div className="footer__column">
          <h4>Account</h4>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>&copy; 2026 SkillBridge AI. Built as a capstone project.</span>
      </div>
    </footer>
  );
}

export default Footer;
