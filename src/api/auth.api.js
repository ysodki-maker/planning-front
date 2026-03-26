import api from './client';

export const authApi = {
  login:          (data)  => api.post('/auth/login', data),
  register:       (data)  => api.post('/auth/register', data),
  me:             ()      => api.get('/auth/me'),
  logout:         (data)  => api.post('/auth/logout', data),
  forgotPassword: (data)  => api.post('/auth/forgot-password', data),
  resetPassword:  (data)  => api.post('/auth/reset-password', data),
  changePassword: (data)  => api.put('/auth/change-password', data),
};
