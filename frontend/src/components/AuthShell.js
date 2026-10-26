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
    <section className={`auth auth--${variant}`}>
      <div className="container auth__layout">
        <aside className="auth-aside" aria-labelledby="auth-aside-title">
          <div className="auth-aside__inner">
            <span className="auth-aside__brand">
              <Sparkles size={17} aria-hidden="true" />
              SkillBridge AI
            </span>

            <div className="auth-aside__copy">
              <span className="auth-aside__eyebrow">{panel.eyebrow}</span>
              <p className="auth-aside__title" id="auth-aside-title">
                {panel.title}
              </p>
              <p className="auth-aside__text">{panel.text}</p>
            </div>

            <ol className="auth-aside__steps">
              {panel.steps.map(({ Icon, title: stepTitle, text }, index) => (
                <li className="auth-aside__step" key={stepTitle}>
                  <span className="auth-aside__step-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <span className="auth-aside__step-number">
                      Step {index + 1}
                    </span>
                    <strong>{stepTitle}</strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="auth-aside__note">
              <ShieldCheck size={17} aria-hidden="true" />
              {panel.note}
            </p>
          </div>
        </aside>

        <div className="auth__card">
          <div className="auth__header">
            <span className="auth__kicker">
              <HeaderIcon size={15} aria-hidden="true" />
              {panel.kicker}
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {children}

          {footer && <p className="auth__footer">{footer}</p>}
        </div>
      </div>
    </section>
  );
}

export default AuthShell;
