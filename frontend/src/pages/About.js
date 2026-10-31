import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Heart,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './About.css';

// About page - static content explaining the platform.
function About() {
  const values = [
    {
      icon: Sparkles,
      title: 'AI with honesty',
      text: 'Our AI provides guidance based on your profile and general career knowledge. It does not guarantee jobs, scholarships, or admissions - you stay in control of your decisions.',
    },
    {
      icon: ShieldCheck,
      title: 'Your data stays yours',
      text: 'We only collect the information needed to personalise your experience, and your profile is private to your account.',
    },
    {
      icon: Heart,
      title: 'Built for Zimbabwe',
      text: 'Designed with the realities of students and entry-level job seekers in Zimbabwe in mind, while remaining useful anywhere.',
    },
  ];

  const differences = [
    'Guidance tailored to your real skill level',
    'Practical projects, not just theory',
    'Opportunities matched to your profile',
    'Clear progress tracking over time',
  ];

  return (
    <div className="about">
      <PageHeader
        eyebrow="About us"
        icon={Compass}
        title="About SkillBridge AI"
        description="A career guidance and opportunity matching platform that connects skills development with real next steps."
      />

      <section className="section section--soft">
        <div className="container about__mission">
          <div className="about__mission-copy">
            <span className="badge">
              <Target size={14} aria-hidden="true" /> Our mission
            </span>
            <h2>Turn effort into a clear next step</h2>
            <p>
              Many young people finish school or teach themselves technical
              skills but struggle to answer two basic questions:{' '}
              <strong>What am I missing?</strong> and{' '}
              <strong>What should I do next?</strong>
            </p>
            <p>
              SkillBridge AI answers those questions by comparing your current
              skills with your career goal, generating a personalised learning
              roadmap, and matching you with jobs, internships, scholarships
              and training opportunities.
            </p>
          </div>

          <div className="card about__mission-card">
            <h3>What makes us different</h3>
            <ul>
              {differences.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about__section-head">
            <span className="badge">
              <Sparkles size={14} aria-hidden="true" /> Our values
            </span>
            <h2>How we approach AI, privacy, and the people we serve</h2>
          </div>

          <div className="about__values">
            {values.map(({ icon: Icon, title, text }) => (
              <article className="card about__value-card" key={title}>
                <span className="about__value-icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container about__bottom">
          <div className="alert alert-warning about__disclaimer">
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
              <strong>Important:</strong> SkillBridge AI provides educational
              guidance only. AI recommendations are suggestions based on
              general career knowledge and your profile - they are not
              professional assessments and never guarantee employment,
              scholarships, or admission to any programme.
            </div>
          </div>

          <div className="card about__cta">
            <div>
              <h2>Ready to map your next step?</h2>
              <p>
                Create a free account, add your skills, and get a practical plan
                you can start on today.
              </p>
            </div>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create your free account <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
