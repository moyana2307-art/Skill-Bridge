import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BrainCircuit,
  Briefcase,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Compass,
  GraduationCap,
  Laptop,
  Lightbulb,
  MapPin,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wifi,
} from 'lucide-react';
import { opportunitiesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import './Home.css';

const PREVIEW_LIMIT = 3;

const TYPE_META = {
  job: { label: 'Job', Icon: Briefcase },
  internship: { label: 'Internship', Icon: GraduationCap },
  scholarship: { label: 'Scholarship', Icon: Award },
  training: { label: 'Training', Icon: BookOpen },
  course: { label: 'Course', Icon: Laptop },
};

const FEATURES = [
  {
    key: 'analysis',
    icon: BrainCircuit,
    title: 'AI skills-gap analysis',
    text: 'Compare your current skills with the requirements of your target role and see which gaps deserve your attention first.',
    points: [
      'Compare your skills with a target role',
      'Prioritise the gaps that matter most',
      'Get a summary you can act on',
    ],
  },
  {
    key: 'roadmaps',
    icon: Route,
    title: 'Personalised roadmaps',
    text: 'Turn your gaps into a step-by-step learning plan with practical projects, useful resources, and clear milestones.',
    points: ['Learn the fundamentals', 'Practise with real projects', 'Apply your new skills'],
  },
  {
    key: 'opportunities',
    icon: Compass,
    title: 'Opportunity discovery',
    text: 'Explore jobs, internships, scholarships, and training programmes in one place, then save the ones worth pursuing.',
    points: ['Jobs', 'Internships', 'Scholarships', 'Training'],
  },
  {
    key: 'progress',
    icon: TrendingUp,
    title: 'Progress tracking',
    text: 'Complete roadmap tasks and keep a visible record of the skills you are building over time.',
    points: ['Tick off completed tasks', 'Keep your skills current', 'Review your next milestone'],
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Create your profile',
    text: 'Add your education, skills, location, and career interests so the guidance starts from your real situation.',
  },
  {
    number: '02',
    title: 'Analyse your gaps',
    text: 'Use AI to compare where you are today with what your target career expects from you.',
  },
  {
    number: '03',
    title: 'Follow your roadmap',
    text: 'Work through a practical plan with projects, resources, and tasks you can complete at your own pace.',
  },
  {
    number: '04',
    title: 'Find opportunities',
    text: 'Explore real listings, save useful ones, and decide which next step fits your goal and your life.',
  },
];

const MOVES = [
  {
    number: '01',
    title: 'Understand the gap',
    text: 'See how your current skills compare with your target role.',
  },
  {
    number: '02',
    title: 'Build the right skills',
    text: 'Follow a roadmap with practical steps and projects.',
  },
  {
    number: '03',
    title: 'Find the right opening',
    text: 'Explore real opportunities that fit the direction you are building.',
  },
];

function formatDeadline(value) {
  if (!value) return 'Deadline not listed';

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return 'Deadline not listed';

  return `Apply by ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

function OpportunityPreviewCard({ opportunity }) {
  const type = TYPE_META[opportunity.opportunity_type] || {
    label: 'Opportunity',
    Icon: Compass,
  };
  const TypeIcon = type.Icon;

  return (
    <article className="card home-opportunity">
      <div className="home-opportunity__top">
        <span
          className={`home-opportunity__type home-opportunity__type--${opportunity.opportunity_type}`}
        >
          <TypeIcon size={15} aria-hidden="true" />
          {type.label}
        </span>
        {opportunity.is_remote && (
          <span className="home-opportunity__remote">
            <Wifi size={14} aria-hidden="true" />
            Remote
          </span>
        )}
      </div>

      <h3>{opportunity.title}</h3>

      {opportunity.organisation && (
        <p className="home-opportunity__org">{opportunity.organisation}</p>
      )}

      <div className="home-opportunity__meta">
        <span>
          <MapPin size={15} aria-hidden="true" />
          {opportunity.is_remote
            ? 'Remote'
            : opportunity.location || 'Location not listed'}
        </span>
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          {formatDeadline(opportunity.application_deadline)}
        </span>
      </div>
    </article>
  );
}

function Home() {
  const { user } = useAuth();
  const [preview, setPreview] = useState({
    status: 'loading',
    items: [],
    total: null,
  });

  useEffect(() => {
    let active = true;

    opportunitiesApi
      .list({ limit: PREVIEW_LIMIT, sort: 'newest', order: 'desc' })
      .then((response) => {
        if (!active) return;

        const items = Array.isArray(response.data) ? response.data : [];

        setPreview({
          status: items.length ? 'success' : 'empty',
          items,
          total: typeof response.meta?.total === 'number' ? response.meta.total : null,
        });
      })
      .catch(() => {
        if (!active) return;
        setPreview({ status: 'error', items: [], total: null });
      });

    return () => {
      active = false;
    };
  }, []);

  const workspaceAction = user
    ? { to: '/profile', label: 'Open your workspace' }
    : { to: '/register', label: 'Create your free account' };

  return (
    <div className="home">
      <PageHeader
        eyebrow="AI career guidance for Zimbabwe"
        icon={Sparkles}
        title={
          <>
            Build skills.{' '}
            <span className="home-hero__highlight">Unlock opportunities.</span>
          </>
        }
        description="Turn your profile into a clear skills plan, a practical learning roadmap, and relevant opportunities - so you always know what to do next."
        actions={
          <>
            <Link to={workspaceAction.to} className="btn btn-primary">
              {workspaceAction.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/opportunities" className="btn btn-outline">
              Explore opportunities
            </Link>
          </>
        }
      />

      <section className="section section--soft">
        <div className="container home-intro">
          <div className="home-intro__copy">
            <span className="home-eyebrow">Start here</span>
            <h2>Your next three moves</h2>
            <p>
              A simple way to turn a career goal into action. No endless course
              lists, no guessing what to do first.
            </p>
            <p className="home-intro__note">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                Free to use. Clear guidance, not guarantees. Built for students,
                graduates, and self-learners.
              </span>
            </p>
          </div>

          <aside className="card home-panel" aria-label="Example SkillBridge guidance plan">
            <div className="home-panel__top">
              <span className="home-panel__label">
                <Sparkles size={14} aria-hidden="true" />
                Example guidance plan
              </span>
              <span className="home-panel__status">Clear next steps</span>
            </div>

            <div className="home-panel__moves">
              {MOVES.map((move) => (
                <div className="home-panel__move" key={move.number}>
                  <span className="home-panel__move-number">{move.number}</span>
                  <div>
                    <strong>{move.title}</strong>
                    <p>{move.text}</p>
                  </div>
                  <CheckCircle2
                    size={18}
                    className="home-panel__move-check"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>

            <p className="home-panel__foot">
              <ShieldCheck size={16} aria-hidden="true" />
              Guidance only. You make the final decision.
            </p>
          </aside>
        </div>
      </section>

      <section className="section home-direction">
        <div className="container home-direction__grid">
          <div className="home-direction__intro">
            <span className="home-eyebrow">Why it feels hard</span>
            <h2>You do not need more advice. You need a next step.</h2>
            <p>
              Career advice is scattered across social feeds, course pages, and
              job boards. SkillBridge brings the important questions into one
              place so you can move with more confidence.
            </p>
          </div>

          <div className="home-direction__points">
            <article className="card home-direction__point">
              <span className="home-direction__icon">
                <Search size={22} aria-hidden="true" />
              </span>
              <div>
                <h3>Know where you stand</h3>
                <p>
                  See the skills you already have and the ones your target role
                  expects.
                </p>
              </div>
            </article>

            <article className="card home-direction__point">
              <span className="home-direction__icon">
                <Lightbulb size={22} aria-hidden="true" />
              </span>
              <div>
                <h3>Know what to learn next</h3>
                <p>
                  Get a focused plan instead of another endless list of courses.
                </p>
              </div>
            </article>

            <article className="card home-direction__point">
              <span className="home-direction__icon">
                <Compass size={22} aria-hidden="true" />
              </span>
              <div>
                <h3>Know where to look</h3>
                <p>
                  Find jobs, internships, scholarships, and training in one
                  discovery page.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section section--soft home-features">
        <div className="container">
          <div className="home-section-head">
            <span className="home-eyebrow">What SkillBridge does</span>
            <h2>From uncertainty to a practical plan.</h2>
            <p>
              Four connected tools that help you move from thinking about your
              career to actively building it.
            </p>
          </div>

          <div className="home-features__grid">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="card home-feature" key={feature.key}>
                  <span className="home-feature__icon">
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>

                  {feature.key === 'opportunities' ? (
                    <div className="home-feature__pills">
                      {feature.points.map((point) => (
                        <span key={point}>{point}</span>
                      ))}
                    </div>
                  ) : (
                    <ul className="home-feature__checks">
                      {feature.points.map((point) => (
                        <li key={point}>
                          <CheckCircle2 size={17} aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section home-steps">
        <div className="container">
          <div className="home-section-head">
            <span className="home-eyebrow">How it works</span>
            <h2>A clear path from profile to progress.</h2>
            <p>
              Start with what you know today, then build toward the work you
              want next.
            </p>
          </div>

          <div className="home-steps__grid">
            {STEPS.map((step) => (
              <article className="card home-step" key={step.number}>
                <span className="home-step__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft home-opportunities">
        <div className="container">
          <div className="home-opportunities__head">
            <div>
              <span className="home-eyebrow home-eyebrow--live">
                <span className="home-live-dot" aria-hidden="true" />
                Live opportunity feed
              </span>
              <h2>Real opportunities, not placeholder listings.</h2>
              <p>
                A preview of current listings from our public opportunity feed.
                New roles appear as sources are synced.
              </p>
            </div>

            <Link to="/opportunities" className="home-text-link">
              Browse all opportunities
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>

          {preview.status === 'loading' && (
            <div
              className="home-opportunities__grid"
              aria-label="Loading opportunities"
              aria-busy="true"
            >
              {[0, 1, 2].map((item) => (
                <div
                  className="card home-opportunity home-opportunity--loading"
                  key={item}
                >
                  <span className="home-skeleton home-skeleton--short" />
                  <span className="home-skeleton" />
                  <span className="home-skeleton home-skeleton--medium" />
                  <span className="home-skeleton home-skeleton--short" />
                </div>
              ))}
            </div>
          )}

          {preview.status === 'success' && (
            <>
              <div className="home-opportunities__grid">
                {preview.items.map((opportunity) => (
                  <OpportunityPreviewCard
                    key={opportunity.id}
                    opportunity={opportunity}
                  />
                ))}
              </div>

              <div className="home-opportunities__note">
                <span>
                  {typeof preview.total === 'number'
                    ? `${preview.total} ${
                        preview.total === 1 ? 'listing' : 'listings'
                      } available.`
                    : 'Live listings from public opportunity sources.'}
                </span>
                <span>
                  Always confirm application details on the original listing.
                </span>
              </div>
            </>
          )}

          {(preview.status === 'empty' || preview.status === 'error') && (
            <div className="card home-opportunities__fallback">
              <span className="home-opportunities__fallback-icon">
                <Compass size={24} aria-hidden="true" />
              </span>
              <div>
                <h3>
                  {preview.status === 'empty'
                    ? 'No opportunities are listed yet.'
                    : 'Live listings could not load right now.'}
                </h3>
                <p>
                  You can still open the opportunities page to check for current
                  listings.
                </p>
              </div>
              <Link to="/opportunities" className="btn btn-outline">
                Explore opportunities
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section home-honesty">
        <div className="container home-honesty__grid">
          <div>
            <span className="home-eyebrow">Built on honest guidance</span>
            <h2>AI can suggest. You decide.</h2>
            <p>
              SkillBridge is designed to widen your options, not make promises
              on your behalf. Use the analysis and roadmap as a starting point,
              then verify the details that matter.
            </p>

            <div className="home-honesty__audiences">
              <span>
                <Users size={16} aria-hidden="true" />
                Students
              </span>
              <span>Recent graduates</span>
              <span>Self-taught learners</span>
              <span>Career starters</span>
            </div>
          </div>

          <aside className="card home-honesty__panel" aria-label="Guidance boundaries">
            <span className="home-honesty__icon">
              <ShieldCheck size={26} aria-hidden="true" />
            </span>
            <h3>Guidance with clear boundaries</h3>
            <ul>
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                Guidance, not guaranteed jobs, scholarships, or admissions.
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                Listings come from real public opportunity sources.
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                Your profile stays private to your account.
              </li>
              <li>
                <CheckCircle2 size={18} aria-hidden="true" />
                You stay in control of every decision.
              </li>
            </ul>
            <p>
              AI guidance is educational and may be incomplete. Always check the
              original opportunity details before applying.
            </p>
          </aside>
        </div>
      </section>

      <section className="home-cta">
        <div className="container home-cta__inner">
          <div>
            <span className="home-eyebrow home-eyebrow--light">
              <Target size={15} aria-hidden="true" />
              Start with a clear direction
            </span>
            <h2>Make your next move a clear one.</h2>
            <p>
              Create your free account, build your profile, and get a practical
              next step in minutes.
            </p>
          </div>

          <div className="home-cta__actions">
            <Link to={workspaceAction.to} className="btn btn-light btn-lg">
              {workspaceAction.label}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {!user && (
              <Link to="/login" className="btn btn-outline-light btn-lg">
                Log in
              </Link>
            )}
            {user && (
              <Link to="/opportunities" className="btn btn-outline-light btn-lg">
                Explore opportunities
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
