// One small wrapper around fetch, so every page handles API responses and
// errors in the same way. credentials: "include" sends the httpOnly login
// cookie that the backend sets.
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

export class ApiError extends Error {
  constructor(message, status = 0, code = 'ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const NETWORK_RETRY_DELAYS_MS = [400, 900, 1500];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readPayload(response) {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const maxAttempts = method === 'GET' ? NETWORK_RETRY_DELAYS_MS.length + 1 : 1;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;
  let response = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && !isFormData
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body:
          body === undefined
            ? undefined
            : isFormData
            ? body
            : JSON.stringify(body),
      });
      break;
    } catch (err) {
      if (attempt < maxAttempts - 1) {
        await wait(NETWORK_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      throw new ApiError(
        'Cannot reach the server. Double-click "start-skillbridge.cmd" in the project root, or run "npm run dev" there.',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  const payload = await readPayload(response);

  if (!response.ok || payload?.success === false) {
    const error = payload?.error || {};

    throw new ApiError(
      error.message || 'Something went wrong. Please try again.',
      response.status,
      error.code || 'ERROR',
      error.details || null
    );
  }

  return payload;
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const text = query.toString();
  return text ? `?${text}` : '';
}

export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),
};

export const metaApi = {
  get: () => apiRequest('/meta'),
};

export const profileApi = {
  get: () => apiRequest('/profile'),
  update: (data) => apiRequest('/profile', { method: 'PATCH', body: data }),
  uploadAvatar: (file) => {
    const body = new FormData();
    body.append('avatar', file);

    return apiRequest('/profile/avatar', { method: 'POST', body });
  },
  removeAvatar: () =>
    apiRequest('/profile/avatar', { method: 'DELETE' }),
};

export const skillsApi = {
  list: (params) => apiRequest(`/skills${toQueryString(params)}`),
};

export const userSkillsApi = {
  list: () => apiRequest('/profile/skills'),
  add: (data) => apiRequest('/profile/skills', { method: 'POST', body: data }),
  update: (skillId, data) =>
    apiRequest(`/profile/skills/${encodeURIComponent(skillId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (skillId) =>
    apiRequest(`/profile/skills/${encodeURIComponent(skillId)}`, {
      method: 'DELETE',
    }),
};

export const careerGoalsApi = {
  list: (params) => apiRequest(`/career-goals${toQueryString(params)}`),
  get: (goalId) =>
    apiRequest(`/career-goals/${encodeURIComponent(goalId)}`),
  create: (data) => apiRequest('/career-goals', { method: 'POST', body: data }),
  update: (goalId, data) =>
    apiRequest(`/career-goals/${encodeURIComponent(goalId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (goalId) =>
    apiRequest(`/career-goals/${encodeURIComponent(goalId)}`, {
      method: 'DELETE',
    }),
};

export const roadmapsApi = {
  list: (params) => apiRequest(`/roadmaps${toQueryString(params)}`),
  get: (roadmapId) =>
    apiRequest(`/roadmaps/${encodeURIComponent(roadmapId)}`),
  create: (data) => apiRequest('/roadmaps', { method: 'POST', body: data }),
  update: (roadmapId, data) =>
    apiRequest(`/roadmaps/${encodeURIComponent(roadmapId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (roadmapId) =>
    apiRequest(`/roadmaps/${encodeURIComponent(roadmapId)}`, {
      method: 'DELETE',
    }),
  createTask: (roadmapId, data) =>
    apiRequest(`/roadmaps/${encodeURIComponent(roadmapId)}/tasks`, {
      method: 'POST',
      body: data,
    }),
  updateTask: (roadmapId, taskId, data) =>
    apiRequest(
      `/roadmaps/${encodeURIComponent(roadmapId)}/tasks/${encodeURIComponent(
        taskId
      )}`,
      { method: 'PATCH', body: data }
    ),
  removeTask: (roadmapId, taskId) =>
    apiRequest(
      `/roadmaps/${encodeURIComponent(roadmapId)}/tasks/${encodeURIComponent(
        taskId
      )}`,
      { method: 'DELETE' }
    ),
};

export const aiApi = {
  skillsGap: (data) =>
    apiRequest('/ai/skills-gap', { method: 'POST', body: data }),
  latestSkillsGap: () => apiRequest('/ai/skills-gap/latest'),
  generateRoadmap: (data) =>
    apiRequest('/ai/roadmaps', { method: 'POST', body: data }),
  opportunityInsight: (data) =>
    apiRequest('/ai/opportunity-insight', { method: 'POST', body: data }),
  profileReview: () =>
    apiRequest('/ai/profile-review', { method: 'POST' }),
  latestProfileReview: () => apiRequest('/ai/profile-review/latest'),
};

export const opportunitiesApi = {
  list: (params) => apiRequest(`/opportunities${toQueryString(params)}`),
  get: (opportunityId) =>
    apiRequest(`/opportunities/${encodeURIComponent(opportunityId)}`),
  matches: (params) =>
    apiRequest(`/opportunities/matches${toQueryString(params)}`),
  saved: () => apiRequest('/opportunities/saved'),
  save: (opportunityId) =>
    apiRequest(`/opportunities/${encodeURIComponent(opportunityId)}/save`, {
      method: 'POST',
    }),
  unsave: (opportunityId) =>
    apiRequest(`/opportunities/${encodeURIComponent(opportunityId)}/save`, {
      method: 'DELETE',
    }),
};

export const dashboardApi = {
  get: () => apiRequest('/dashboard'),
};

export const careerApi = {
  runAssessment: (data) =>
    apiRequest('/career/assessments', { method: 'POST', body: data }),
  latestAssessment: () => apiRequest('/career/assessments/latest'),
  recommendations: (data) =>
    apiRequest('/career/recommendations', { method: 'POST', body: data }),
  latestRecommendations: () => apiRequest('/career/recommendations/latest'),
  compare: (data) => apiRequest('/career/compare', { method: 'POST', body: data }),
  latestComparison: () => apiRequest('/career/compare/latest'),
  requirements: (data) =>
    apiRequest('/career/requirements', { method: 'POST', body: data }),
  latestRequirements: () => apiRequest('/career/requirements/latest'),
};

export const mentorApi = {
  list: () => apiRequest('/mentor'),
  create: (data) => apiRequest('/mentor', { method: 'POST', body: data }),
  get: (threadId) => apiRequest(`/mentor/${encodeURIComponent(threadId)}`),
  update: (threadId, data) =>
    apiRequest(`/mentor/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (threadId) =>
    apiRequest(`/mentor/${encodeURIComponent(threadId)}`, { method: 'DELETE' }),
  send: (threadId, content) =>
    apiRequest(`/mentor/${encodeURIComponent(threadId)}/messages`, {
      method: 'POST',
      body: { content },
    }),
};

export const applicationsApi = {
  list: (params) => apiRequest(`/applications${toQueryString(params)}`),
  summary: () => apiRequest('/applications/summary'),
  get: (applicationId) =>
    apiRequest(`/applications/${encodeURIComponent(applicationId)}`),
  create: (data) => apiRequest('/applications', { method: 'POST', body: data }),
  update: (applicationId, data) =>
    apiRequest(`/applications/${encodeURIComponent(applicationId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (applicationId) =>
    apiRequest(`/applications/${encodeURIComponent(applicationId)}`, {
      method: 'DELETE',
    }),
};

export const careerStudioApi = {
  listCvs: () => apiRequest('/career-studio/cvs'),
  generateCv: (data) =>
    apiRequest('/career-studio/cvs', { method: 'POST', body: data }),
  getCv: (cvId) => apiRequest(`/career-studio/cvs/${encodeURIComponent(cvId)}`),
  updateCv: (cvId, data) =>
    apiRequest(`/career-studio/cvs/${encodeURIComponent(cvId)}`, {
      method: 'PATCH',
      body: data,
    }),
  removeCv: (cvId) =>
    apiRequest(`/career-studio/cvs/${encodeURIComponent(cvId)}`, {
      method: 'DELETE',
    }),
  analyzeCv: (cvId, data) =>
    apiRequest(`/career-studio/cvs/${encodeURIComponent(cvId)}/analyze`, {
      method: 'POST',
      body: data,
    }),
  listCoverLetters: () => apiRequest('/career-studio/cover-letters'),
  generateCoverLetter: (data) =>
    apiRequest('/career-studio/cover-letters', { method: 'POST', body: data }),
  removeCoverLetter: (coverLetterId) =>
    apiRequest(
      `/career-studio/cover-letters/${encodeURIComponent(coverLetterId)}`,
      { method: 'DELETE' }
    ),
  listInterviews: () => apiRequest('/career-studio/interviews'),
  startInterview: (data) =>
    apiRequest('/career-studio/interviews', { method: 'POST', body: data }),
  getInterview: (interviewId) =>
    apiRequest(`/career-studio/interviews/${encodeURIComponent(interviewId)}`),
  answer: (interviewId, data) =>
    apiRequest(
      `/career-studio/interviews/${encodeURIComponent(interviewId)}/answers`,
      { method: 'POST', body: data }
    ),
  completeInterview: (interviewId) =>
    apiRequest(
      `/career-studio/interviews/${encodeURIComponent(interviewId)}/complete`,
      { method: 'POST' }
    ),
  removeInterview: (interviewId) =>
    apiRequest(`/career-studio/interviews/${encodeURIComponent(interviewId)}`, {
      method: 'DELETE',
    }),
};

export const projectsApi = {
  list: (params) => apiRequest(`/projects${toQueryString(params)}`),
  get: (projectId) => apiRequest(`/projects/${encodeURIComponent(projectId)}`),
  create: (data) => apiRequest('/projects', { method: 'POST', body: data }),
  update: (projectId, data) =>
    apiRequest(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (projectId) =>
    apiRequest(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    }),
  submit: (projectId) =>
    apiRequest(`/projects/${encodeURIComponent(projectId)}/submit`, {
      method: 'POST',
    }),
  evaluate: (projectId) =>
    apiRequest(`/projects/${encodeURIComponent(projectId)}/evaluate`, {
      method: 'POST',
    }),
  recommendations: (data) =>
    apiRequest('/projects/recommendations', { method: 'POST', body: data }),
};

export const portfolioApi = {
  getSettings: () => apiRequest('/portfolio/settings'),
  updateSettings: (data) =>
    apiRequest('/portfolio/settings', { method: 'PATCH', body: data }),
  getPublic: (slug) => apiRequest(`/portfolio/${encodeURIComponent(slug)}`),
};

export const analyticsApi = {
  employability: () => apiRequest('/analytics/employability'),
};

export const notificationsApi = {
  list: (params) => apiRequest(`/notifications${toQueryString(params)}`),
  unreadCount: () => apiRequest('/notifications/unread-count'),
  markRead: (notificationId) =>
    apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
    }),
  markAllRead: () =>
    apiRequest('/notifications/read-all', { method: 'POST' }),
  remove: (notificationId) =>
    apiRequest(`/notifications/${encodeURIComponent(notificationId)}`, {
      method: 'DELETE',
    }),
};

export const adminApi = {
  overview: () => apiRequest('/admin/overview'),
  users: (params) => apiRequest(`/admin/users${toQueryString(params)}`),
  updateUser: (userId, data) =>
    apiRequest(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: data,
    }),
  removeUser: (userId) =>
    apiRequest(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),
  announce: (data) =>
    apiRequest('/admin/announcements', { method: 'POST', body: data }),
  subscriptions: (params) =>
    apiRequest(`/admin/subscriptions${toQueryString(params)}`),
  planRequests: (params) =>
    apiRequest(`/admin/plan-requests${toQueryString(params)}`),
  reviewPlanRequest: (requestId, status) =>
    apiRequest(`/admin/plan-requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: { status },
    }),
  institutions: (params) =>
    apiRequest(`/admin/institutions${toQueryString(params)}`),
  updateInstitution: (institutionId, data) =>
    apiRequest(`/admin/institutions/${encodeURIComponent(institutionId)}`, {
      method: 'PATCH',
      body: data,
    }),
};

export const subscriptionsApi = {
  plans: () => apiRequest('/subscriptions/plans'),
  me: () => apiRequest('/subscriptions/me'),
  requests: () => apiRequest('/subscriptions/requests'),
  requestUpgrade: (data) =>
    apiRequest('/subscriptions/requests', { method: 'POST', body: data }),
};

export const paymentsApi = {
  providers: () => apiRequest('/payments/providers'),
  checkout: (data) =>
    apiRequest('/payments/checkout', { method: 'POST', body: data }),
  status: (reference, provider = 'paynow') =>
    apiRequest(
      `/payments/status/${encodeURIComponent(reference)}${toQueryString({
        provider,
      })}`
    ),
};

export const institutionsApi = {
  list: () => apiRequest('/institutions'),
  create: (data) => apiRequest('/institutions', { method: 'POST', body: data }),
  get: (institutionId) =>
    apiRequest(`/institutions/${encodeURIComponent(institutionId)}`),
  update: (institutionId, data) =>
    apiRequest(`/institutions/${encodeURIComponent(institutionId)}`, {
      method: 'PATCH',
      body: data,
    }),
  addMember: (institutionId, data) =>
    apiRequest(`/institutions/${encodeURIComponent(institutionId)}/members`, {
      method: 'POST',
      body: data,
    }),
  addMembers: (institutionId, data) =>
    apiRequest(
      `/institutions/${encodeURIComponent(institutionId)}/members/bulk`,
      { method: 'POST', body: data }
    ),
  updateMember: (institutionId, userId, data) =>
    apiRequest(
      `/institutions/${encodeURIComponent(
        institutionId
      )}/members/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: data }
    ),
  removeMember: (institutionId, userId) =>
    apiRequest(
      `/institutions/${encodeURIComponent(
        institutionId
      )}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    ),
};

export const resourcesApi = {
  list: (params) => apiRequest(`/resources${toQueryString(params)}`),
  get: (resourceId) => apiRequest(`/resources/${encodeURIComponent(resourceId)}`),
  create: (data) => apiRequest('/resources', { method: 'POST', body: data }),
  update: (resourceId, data) =>
    apiRequest(`/resources/${encodeURIComponent(resourceId)}`, {
      method: 'PATCH',
      body: data,
    }),
  remove: (resourceId) =>
    apiRequest(`/resources/${encodeURIComponent(resourceId)}`, {
      method: 'DELETE',
    }),
};
