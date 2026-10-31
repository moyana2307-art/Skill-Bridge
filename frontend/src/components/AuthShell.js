import {
  BrainCircuit,
  Compass,
  LockKeyhole,
  Route,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
} from 'lucide-react';
import PageHeader from './PageHeader';
import './Auth.css';

const PANELS = {
  login: {
    HeaderIcon: LockKeyhole,
    kicker: 'Secure account access',
    eyebrow: 'Welcome back',
    title: 'Your next step is still here.',
    text: 'Log in to continue with the skills, roadmap, and opportunities you were already working on.',
    steps: [
      {
        Icon: BrainCircuit,
        title: 'Review your skills analysis',
        text: 'Return to the gaps and priorities you saved.',
      },
      {
        Icon: Route,
        title: 'Continue your roadmap',
        text: 'Pick up the next task without losing your progress.',
      },
      {
        Icon: Compass,
        title: 'Check relevant opportunities',
        text: 'Browse real listings and revisit the ones you saved.',
      },
    ],
    note: 'Your profile and saved opportunities stay private to your account.',
  },
  register: {
    HeaderIcon: UserPlus,
    kicker: 'Start your workspace',
    eyebrow: 'Create a free account',
    title: 'Start with where you are today.',
    text: 'Add your education, skills, and career interests, then turn them into a clear plan for what comes next.',
    steps: [
      {
        Icon: UserRound,
        title: 'Build your profile',
        text: 'Show the skills and experience you already have.',
      },
      {
        Icon: BrainCircuit,
        title: 'See your skills gap',
        text: 'Compare your current skills with a target role.',
      },
      {
        Icon: Route,
        title: 'Follow a practical roadmap',
        text: 'Get tasks, resources, and projects you can act on.',
      },
    ],
    note: 'Free to use. Guidance only - never guaranteed jobs, scholarships, or admissions.',
  },
};

function AuthShell({ variant = 'login', title, description, children, footer }) {
  const panel = PANELS[variant] || PANELS.login;
  const { HeaderIcon } = panel;

  return (
    <div className={`auth auth--${variant}`}>
      <PageHeader
        eyebrow={panel.kicker}
        icon={HeaderIcon}
        title={title}
        description={description}
      />

      <section className="section section--soft">
        <div className="container auth__layout">
          <aside className="card auth__aside" aria-labelledby="auth-aside-title">
            <span className="badge">
              <Sparkles size={14} aria-hidden="true" />
              {panel.eyebrow}
            </span>
            <h2 id="auth-aside-title">{panel.title}</h2>
            <p className="auth__aside-text">{panel.text}</p>

            <ol className="auth__steps">
              {panel.steps.map(({ Icon, title: stepTitle, text }, index) => (
                <li className="auth__step" key={stepTitle}>
                  <span className="auth__step-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <span className="auth__step-number">Step {index + 1}</span>
                    <strong>{stepTitle}</strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="auth__note">
              <ShieldCheck size={17} aria-hidden="true" />
              {panel.note}
            </p>
          </aside>

          <div className="card auth__card">
            {children}
            {footer && <p className="auth__footer">{footer}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuthShell;
