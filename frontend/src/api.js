/**
 * API helper for TidyTime frontend
 */
const BASE = '/api';

async function request(path, options = {}) {
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(`${BASE}${path}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  signup: (data) => request('/auth/signup', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Children
  getChildren: () => request('/children'),
  addChild: (data) => request('/children', { method: 'POST', body: data }),
  updateChild: (id, data) => request(`/children/${id}`, { method: 'PUT', body: data }),
  deleteChild: (id) => request(`/children/${id}`, { method: 'DELETE' }),

  // Chores
  getChores: () => request('/chores'),
  addChore: (data) => request('/chores', { method: 'POST', body: data }),
  updateChore: (id, data) => request(`/chores/${id}`, { method: 'PUT', body: data }),
  deleteChore: (id) => request(`/chores/${id}`, { method: 'DELETE' }),

  // Daily tracking
  getChildToday: (id) => request(`/children/${id}/today`),
  completeChore: (childId, choreId) => request(`/children/${childId}/complete/${choreId}`, { method: 'POST' }),
  uncompleteChore: (childId, choreId) => request(`/children/${childId}/uncomplete/${choreId}`, { method: 'DELETE' }),

  // Screen time
  useTime: (childId, minutes) => request(`/children/${childId}/use-time`, { method: 'POST', body: { minutes } }),
  getUsage: (childId) => request(`/children/${childId}/usage`),

  // Upgrade
  upgrade: () => request('/upgrade', { method: 'POST' }),

  // Child-facing
  childLogin: (childId, pin) => request('/child/login', { method: 'POST', body: { child_id: childId, pin } }),
  childView: (childId) => request(`/child/${childId}/view`),
};
