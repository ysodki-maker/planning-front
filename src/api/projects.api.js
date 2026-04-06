import api from './client';

export const projectsApi = {
  getAll:      (params) => api.get('/projects', { params }),
  getOne:      (id)     => api.get(`/projects/${id}`),
  getStats:    ()       => api.get('/projects/stats'),
  getCalendar: (params) => api.get('/projects/calendar', { params }),
  create:      (data)   => api.post('/projects', data),
  update:      (id, data) => api.put(`/projects/${id}`, data),
  delete:      (id)     => api.delete(`/projects/${id}`),
  confirm:     (id, data) => api.post(`/projects/${id}/confirm`, data || {}),
  assignUsers: (id, data) => api.post(`/projects/${id}/assign`, data),
  removeUser:  (id, userId) => api.delete(`/projects/${id}/assign/${userId}`),
};
