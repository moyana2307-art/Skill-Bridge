import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  Map,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
} from 'lucide-react';
import './Home.css';

// Landing page. All content here is static marketing copy -
// no backend data is involved in this stage.
function Home() {
  const features = [
    {
      icon: <BrainCircuit size={30} />,
      title: 'AI Skills-Gap Analysis',
      text: 'Compare your current skills with the requirements of your target career and see exactly what you need to develop next.',
    },
    {
      icon: <Map size={30} />,
      title: 'Personalised Learning Roadmaps',
      text: 'Receive a step-by-step plan with projects, resources and timelines tailored to your goals and experience level.',
    },
    {
      icon: <Target size={30} />,
      title: 'Opportunity Matching',
      text: 'Discover jobs, internships, scholarships and training programmes matched to your skills and interests.',
    },
    {
      icon: <TrendingUp size={30} />,
      title: 'Progress Tracking',
      text: 'Mark tasks complete, follow your roadmap, and watch your career readiness grow week by week.',
    },
  ];

  const steps = [
    {
      number: '1',
      title: 'Create your profile',
      text: 'Tell us about your education, skills, location and career interests.',
    },
    {
      number: '2',
      title: 'Get your analysis',
      text: 'Our AI compares where you are today with where your chosen career needs you to be.',
    },
    {
      number: '3',
      title: 'Follow your roadmap',
      text: 'Work through a personalised learning plan with practical projects and resources.',
    },
    {
      number: '4',
      title: 'Discover opportunities',
      text: 'Browse and save jobs, internships, scholarships and training matched to your profile.',
    },
  ];

  return (
    <div className="home">
      {/* Hero section */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__content">
            <span className="badge">Built for young people in Zimbabwe</span>
            <h1>
              Turn your skills into{' '}
              <span className="hero__highlight">real opportunities</span>
            </h1>
            <p className="hero__subtitle">
              SkillBridge AI helps students, graduates and self-learners
              understand their skill gaps, build personalised learning
              roadmaps, and discover jobs, internships and scholarships that
              match their goals.
            </p>
            <div className="hero__actions">
              <Link to="/register" className="btn btn-secondary btn-lg">
                Get Started Free
              </Link>
              <Link to="/about" className="btn btn-outline btn-lg">
                Learn More
              </Link>
            </div>
            <p className="hero__note">
              <CheckCircle2 size={16} /> Free to use. AI guidance with human
              judgement - no guarantees promised, just clear next steps.
            </p>
          </div>

          <div className="hero__visual card">
            <div className="hero__visual-header">
              <Users size={20} />
              <span>Your career journey</span>
            </div>
            <div className="hero__visual-step">
              <span className="hero__visual-dot" />
              <div>
                <strong>Assess</strong>
                <p>Where are your skills today?</p>
              </div>
            </div>
            <div className="hero__visual-step">
              <span className="hero__visual-dot" />
              <div>
                <strong>Learn</strong>
                <p>Follow a plan built for you.</p>
              </div>
            </div>
            <div className="hero__visual-step">
              <span className="hero__visual-dot" />
              <div>
                <strong>Apply</strong>
                <p>Match with real opportunities.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="section section--white">
        <div className="container">
          <h2 className="section-title text-center">
            Everything you need to grow
          </h2>
          <p className="section-subtitle text-center">
            One platform that connects learning with the opportunities you are
            working towards.
          </p>
          <div className="features__grid">
            {features.map((feature) => (
              <div className="card feature__card" key={feature.title}>
                <div className="feature__icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title text-center">How it works</h2>
          <p className="section-subtitle text-center">
            Four simple steps from where you are to where you want to be.
          </p>
          <div className="steps__grid">
            {steps.map((step) => (
              <div className="step" key={step.number}>
                <div className="step__number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience section */}
      <section className="section section--white">
        <div className="container">
          <h2 className="section-title text-center">Who is it for?</h2>
          <p className="section-subtitle text-center">
            SkillBridge AI is designed for anyone at the start of their
            professional journey.
          </p>
          <div className="audience__grid">
            {[
              'University students exploring career paths',
              'Recent graduates looking for first roles',
              'Self-taught learners who need structure',
              'Junior developers and entry-level job seekers',
              'Anyone improving their professional skills',
            ].map((item) => (
              <div className="audience__item" key={item}>
                <CheckCircle2 size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action section */}
      <section className="cta-banner">
        <div className="container cta-banner__inner">
          <div>
            <h2>Ready to build your future?</h2>
            <p>
              Create your free account and get a clear picture of your next
              steps in minutes.
            </p>
          </div>
          <Link to="/register" className="btn btn-light btn-lg">
            Create Your Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Quick links (temporary - replaced by real pages in later stages) */}
      <section className="section">
        <div className="container text-center">
          <p className="home__placeholder-note">
            Placeholder pages:{" "}
            <Link to="/login">Log in</Link> and{" "}
            <Link to="/register">Register</Link> are built in Stage 5.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Home;
