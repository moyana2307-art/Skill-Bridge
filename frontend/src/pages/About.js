import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import './About.css';

// About page - static content explaining the platform.
function About() {
  const values = [
    {
      icon: <Sparkles size={26} />,
      title: 'AI with honesty',
      text: 'Our AI provides guidance based on your profile and general career knowledge. It does not guarantee jobs, scholarships, or admissions - you stay in control of your decisions.',
    },
    {
      icon: <ShieldCheck size={26} />,
      title: 'Your data stays yours',
      text: 'We only collect the information needed to personalise your experience, and your profile is private to your account.',
    },
    {
      icon: <Heart size={26} />,
      title: 'Built for Zimbabwe',
      text: 'Designed with the realities of students and entry-level job seekers in Zimbabwe in mind, while remaining useful anywhere.',
    },
  ];

  return (
    <div className="about">
      <section className="about__hero">
        <div className="container text-center">
          <h1>About SkillBridge AI</h1>
          <p>
            A career guidance and opportunity matching platform that connects
            skills development with real next steps.
          </p>
        </div>
      </section>

      <section className="section section--white">
        <div className="container about__mission">
          <div>
            <h2>Our mission</h2>
            <p>
              Many young people finish school or teach themselves technical
              skills but struggle to answer two basic questions:{" "}
              <strong>What am I missing?</strong> and{" "}
              <strong>What should I do next?</strong>
            </p>
            <p>
              SkillBridge AI answers those questions by comparing your current
              skills with your career goal, generating a personalised learning
              roadmap, and matching you with jobs, internships, scholarships
              and training opportunities.
            </p>
          </div>
          <div className="about__mission-card card">
            <h3>What makes us different</h3>
            <ul>
              <li>Guidance tailored to your real skill level</li>
              <li>Practical projects, not just theory</li>
              <li>Opportunities matched to your profile</li>
              <li>Clear progress tracking over time</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title text-center">Our values</h2>
          <p className="section-subtitle text-center">
            How we approach AI, privacy, and the people we serve.
          </p>
          <div className="about__values">
            {values.map((value) => (
              <div className="card about__value-card" key={value.title}>
                <div className="about__value-icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="container">
          <div className="about__disclaimer alert alert-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Important:</strong> SkillBridge AI provides educational
              guidance only. AI recommendations are suggestions based on
              general career knowledge and your profile - they are not
              professional assessments and never guarantee employment,
              scholarships, or admission to any programme.
            </div>
          </div>

          <div className="text-center">
            <Link to="/register" className="btn btn-secondary btn-lg">
              Create Your Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
