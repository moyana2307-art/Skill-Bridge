// One small wrapper around fetch, so every page handles API responses and
// errors in the same way. credentials: "include" sends the httpOnly login
// cookie that the backend sets.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(message, status = 0, code = 'ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(
      'Cannot reach the server. Make sure the backend is running.',
      0,
      'NETWORK_ERROR'
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (err) {
    payload = null;
  }

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
