import api from './client';

export const usersApi = {
  getAll:        (params) => api.get('/users', { params }),
  getOne:        (id)     => api.get(`/users/${id}`),
  create:        (data)   => api.post('/users', data),
  update:        (id, data) => api.put(`/users/${id}`, data),
  delete:        (id)     => api.delete(`/users/${id}`),
  getProfile:    ()       => api.get('/users/profile'),
  updateProfile: (data)   => api.put('/users/profile', data),
};
