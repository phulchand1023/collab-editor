import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://collab-text-editor-backend.phulchandkr7715.workers.dev';

const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const documentsAPI = {
  list: (params) => api.get('/docs', { params }),
  create: (data) => api.post('/docs', data),
  getSnapshot: (id) => api.get(`/docs/${id}/snapshot`),
  updatePermissions: (id, data) => api.put(`/docs/${id}/permissions`, data),
  share: (id, data) => api.post(`/docs/${id}/share`, data),
  delete: (id) => api.delete(`/docs/${id}`),
};

export default api;