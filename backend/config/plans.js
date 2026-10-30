// Plan definitions and feature gates for the freemium model.
//
// The database stores the same plan catalogue so admins and future billing can
// read it, but these definitions are the source of truth for enforcement.
// Change a limit here and the API applies it immediately.

const PLAN_CODES = ['free', 'plus', 'premium', 'institution'];

const PLANS = {
  free: {
    code: 'free',
    name: 'Free',
    description: 'Start exploring careers and build one learning roadmap.',
    price_cents: 0,
    currency: 'USD',
    billing_interval: 'none',
    rank: 0,
    sort_order: 0,
    feature_list: [
      'Basic career assessment',
      'Limited AI career recommendations',
      'Basic skills gap analysis',
      'One learning roadmap',
      'Browse opportunities',
      'Basic user dashboard',
    ],
    limits: {
      career_assessments_per_month: 1,
      career_recommendations_per_month: 3,
      skills_gap_analyses_per_month: 2,
      ai_roadmaps_per_month: 1,
      active_roadmaps: 1,
      mentor_messages_per_month: 0,
      cv_generations_per_month: 0,
      cover_letters_per_month: 0,
      mock_interviews_per_month: 0,
      project_ideas_per_month: 0,
      project_evaluations_per_month: 1,
      ai_analyses_per_month: 8,
    },
  },
  plus: {
    code: 'plus',
    name: 'SkillBridge Plus',
    description:
      'Unlimited guidance, mentor, CV builder, interview practice, and advanced analytics.',
    price_cents: 500,
    currency: 'USD',
    billing_interval: 'month',
    rank: 1,
    sort_order: 1,
    recommended: true,
    feature_list: [
      'Higher-limit AI career guidance',
      'Detailed skills gap analysis',
      'Personalised learning roadmaps',
      'AI career mentor',
      'AI CV builder',
      'Interview preparation',
      'Advanced progress analytics',
    ],
    limits: {
      career_assessments_per_month: 5,
      career_recommendations_per_month: 30,
      skills_gap_analyses_per_month: 20,
      ai_roadmaps_per_month: 20,
      active_roadmaps: 20,
      mentor_messages_per_month: 300,
      cv_generations_per_month: 20,
      cover_letters_per_month: 5,
      mock_interviews_per_month: 2,
      project_ideas_per_month: 10,
      project_evaluations_per_month: 20,
      ai_analyses_per_month: 150,
    },
  },
  premium: {
    code: 'premium',
    name: 'SkillBridge Premium',
    description:
      'Everything in Plus, plus advanced CV tools, more interviews, project ideas, and portfolio reviews.',
    price_cents: 1000,
    currency: 'USD',
    billing_interval: 'month',
    rank: 2,
    sort_order: 2,
    feature_list: [
      'Everything in Plus',
      'Advanced CV and cover letter tools',
      'More AI interview simulations',
      'Personalised project recommendations',
      'Portfolio reviews',
      'Advanced career insights',
      'Priority support',
    ],
    limits: {
      career_assessments_per_month: 20,
      career_recommendations_per_month: 100,
      skills_gap_analyses_per_month: 100,
      ai_roadmaps_per_month: 100,
      active_roadmaps: 100,
      mentor_messages_per_month: 1000,
      cv_generations_per_month: 100,
      cover_letters_per_month: 50,
      mock_interviews_per_month: 15,
      project_ideas_per_month: 100,
      project_evaluations_per_month: 100,
      ai_analyses_per_month: 500,
    },
  },
  institution: {
    code: 'institution',
    name: 'Institution',
    description:
      'Full access assigned to students and members through a partner institution.',
    price_cents: 0,
    currency: 'USD',
    billing_interval: 'none',
    rank: 3,
    sort_order: 3,
    feature_list: [
      'Everything in Premium',
      'Assigned by your institution',
      'Student progress reporting',
      'Bulk member access',
    ],
    limits: {
      career_assessments_per_month: 20,
      career_recommendations_per_month: 100,
      skills_gap_analyses_per_month: 100,
      ai_roadmaps_per_month: 100,
      active_roadmaps: 100,
      mentor_messages_per_month: 1000,
      cv_generations_per_month: 100,
      cover_letters_per_month: 50,
      mock_interviews_per_month: 15,
      project_ideas_per_month: 100,
      project_evaluations_per_month: 100,
      ai_analyses_per_month: 500,
    },
  },
};

const INSTITUTION_PACKAGES = {
  small: { code: 'small', name: 'Small institution', price_cents: 4900, seat_limit: 50 },
  growing: { code: 'growing', name: 'Growing institution', price_cents: 9900, seat_limit: 150 },
  large: { code: 'large', name: 'Large institution', price_cents: 19900, seat_limit: 500 },
};

// Each gate names the minimum plan rank and, optionally, the monthly limit that
// applies once the user is on that plan.
const FEATURES = {
  career_assessment: { min_rank: 0, limit: 'career_assessments_per_month' },
  career_recommendations: { min_rank: 0, limit: 'career_recommendations_per_month' },
  skills_gap_basic: { min_rank: 0 },
  skills_gap_detailed: { min_rank: 1 },
  roadmaps: { min_rank: 0, limit: 'active_roadmaps' },
  ai_roadmaps: { min_rank: 0, limit: 'ai_roadmaps_per_month' },
  mentor: { min_rank: 1, limit: 'mentor_messages_per_month' },
  cv_builder: { min_rank: 1, limit: 'cv_generations_per_month' },
  cv_analysis: { min_rank: 1 },
  cover_letters: { min_rank: 2, limit: 'cover_letters_per_month' },
  mock_interviews: { min_rank: 1, limit: 'mock_interviews_per_month' },
  project_ideas: { min_rank: 2, limit: 'project_ideas_per_month' },
  project_evaluations: { min_rank: 1, limit: 'project_evaluations_per_month' },
  portfolio_review: { min_rank: 2 },
  advanced_analytics: { min_rank: 1 },
  career_compare: { min_rank: 1 },
  career_requirements: { min_rank: 1 },
  public_portfolio: { min_rank: 0 },
  priority_support: { min_rank: 2 },
  ai_analyses: { min_rank: 0, limit: 'ai_analyses_per_month' },
};

const FEATURE_LABELS = {
  career_assessment: 'Career assessments',
  career_recommendations: 'AI career recommendations',
  skills_gap_basic: 'Basic skills gap analysis',
  skills_gap_detailed: 'Detailed skills gap analysis',
  roadmaps: 'Active learning roadmaps',
  ai_roadmaps: 'AI-generated roadmaps',
  mentor: 'AI career mentor',
  cv_builder: 'AI CV builder',
  cv_analysis: 'CV reviews',
  cover_letters: 'Cover letter tools',
  mock_interviews: 'Mock interviews',
  project_ideas: 'Project recommendations',
  project_evaluations: 'Project evaluations',
  portfolio_review: 'Portfolio reviews',
  advanced_analytics: 'Advanced analytics',
  career_compare: 'Career path comparison',
  career_requirements: 'Role requirements',
  public_portfolio: 'Public portfolio',
  priority_support: 'Priority support',
  ai_analyses: 'AI analyses',
};

// Maps each limited feature to the table that records usage.
const LIMIT_SOURCES = {
  career_assessments_per_month: {
    sql: `SELECT COUNT(*) AS used FROM career_assessments
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  career_recommendations_per_month: {
    sql: `SELECT COUNT(*) AS used FROM ai_analyses
      WHERE user_id = $1 AND analysis_type = 'career_recommendations'
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  skills_gap_analyses_per_month: {
    sql: `SELECT COUNT(*) AS used FROM ai_analyses
      WHERE user_id = $1 AND analysis_type = 'skills_gap'
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  ai_roadmaps_per_month: {
    sql: `SELECT COUNT(*) AS used FROM learning_roadmaps
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  active_roadmaps: {
    sql: `SELECT COUNT(*) AS used FROM learning_roadmaps
      WHERE user_id = $1 AND status = 'active'`,
  },
  mentor_messages_per_month: {
    sql: `SELECT COUNT(*) AS used FROM mentor_messages m
      JOIN mentor_threads t ON t.id = m.thread_id
      WHERE t.user_id = $1 AND m.role = 'user'
        AND m.created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  cv_generations_per_month: {
    sql: `SELECT COUNT(*) AS used FROM cv_documents
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  cover_letters_per_month: {
    sql: `SELECT COUNT(*) AS used FROM cover_letters
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  mock_interviews_per_month: {
    sql: `SELECT COUNT(*) AS used FROM mock_interviews
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  project_ideas_per_month: {
    sql: `SELECT COUNT(*) AS used FROM ai_analyses
      WHERE user_id = $1 AND analysis_type = 'project_recommendations'
        AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  project_evaluations_per_month: {
    sql: `SELECT COUNT(*) AS used FROM projects
      WHERE user_id = $1 AND evaluation IS NOT NULL
        AND updated_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
  ai_analyses_per_month: {
    sql: `SELECT COUNT(*) AS used FROM ai_analyses
      WHERE user_id = $1 AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)`,
  },
};

function getPlan(code) {
  return PLANS[code] || PLANS.free;
}

function getPlanByRank(rank) {
  return (
    Object.values(PLANS)
      .filter((plan) => plan.rank === rank)
      .sort((a, b) => a.sort_order - b.sort_order)[0] || PLANS.free
  );
}

function planForRank(rank) {
  const matching = Object.values(PLANS)
    .filter((plan) => plan.rank <= rank)
    .sort((a, b) => b.rank - a.rank);
  return matching[0] || PLANS.free;
}

function nextPlan(code) {
  const current = getPlan(code);
  return (
    Object.values(PLANS)
      .filter((plan) => plan.rank > current.rank && plan.code !== 'institution')
      .sort((a, b) => a.rank - b.rank)[0] || null
  );
}

module.exports = {
  PLAN_CODES,
  PLANS,
  INSTITUTION_PACKAGES,
  FEATURES,
  FEATURE_LABELS,
  LIMIT_SOURCES,
  getPlan,
  getPlanByRank,
  planForRank,
  nextPlan,
};
