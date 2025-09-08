import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error?.message || 
                   error.response?.data?.error || 
                   'Une erreur est survenue';

    if (error.response?.status === 401) {
      Cookies.remove('auth_token');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('Erreur serveur. Veuillez réessayer plus tard.');
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),

};

// Organizations API
export const organizationsAPI = {
  getOrganizations: (params) => api.get('/organizations', { params }),
  getCurrentOrganization: () => api.get('/organizations/current'),
  updateCurrentOrganization: (data) => api.put('/organizations/current', data),
  createOrganization: (data) => api.post('/organizations', data),
  updateOrganizationSubscription: (id, data) => api.put(`/organizations/${id}/subscription`, data),
  getOrganizationStats: (id) => api.get(`/organizations/${id}/stats`),
  getSubscriptionPlans: () => api.get('/organizations/plans'),
};

// Imports/Exports API
export const importsAPI = {
  uploadImport: (formData) => api.post('/imports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getImports: (params) => api.get('/imports', { params }),
  getImport: (id) => api.get(`/imports/${id}`),
  deleteImport: (id) => api.delete(`/imports/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getInventoryItems: (params) => api.get('/inventory', { params }),
  getInventoryItem: (id) => api.get(`/inventory/${id}`),
  createInventoryItem: (data) => api.post('/inventory', data),
  updateInventoryItem: (id, data) => api.put(`/inventory/${id}`, data),
  deleteInventoryItem: (id) => api.delete(`/inventory/${id}`),
  getInventoryStats: () => api.get('/inventory/stats'),
};

export const exportsAPI = {
  createExport: (data) => api.post('/exports/create', data),
  getExports: (params) => api.get('/exports', { params }),
  downloadExport: (id) => api.get(`/exports/${id}/download`, { responseType: 'blob' }),
  deleteExport: (id) => api.delete(`/exports/${id}`),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Missions API
export const missionsAPI = {
  getMissions: (params) => api.get('/missions', { params }),
  getMission: (id) => api.get(`/missions/${id}`),
  createMission: (missionData) => api.post('/missions', missionData),
  updateMission: (id, missionData) => api.put(`/missions/${id}`, missionData),
  deleteMission: (id) => api.delete(`/missions/${id}`),
  getDashboardStats: () => api.get('/missions/dashboard/stats'),
};

// Sites API
export const sitesAPI = {
  getSites: (missionId) => api.get(`/missions/${missionId}/sites`),
  createSite: (missionId, siteData) => api.post(`/missions/${missionId}/sites`, siteData),
  updateSite: (siteId, siteData) => api.put(`/sites/${siteId}`, siteData),
  deleteSite: (siteId) => api.delete(`/sites/${siteId}`),
};

// Inventory API
export const inventoryAPI = {
  getInventory: (params) => api.get('/inventory', { params }),
  createInventoryItem: (itemData) => api.post('/inventory', itemData),
  updateInventoryItem: (id, itemData) => api.put(`/inventory/${id}`, itemData),
  deleteInventoryItem: (id) => api.delete(`/inventory/${id}`),
};

// Infrastructure API
export const infrastructureAPI = {
  getInfrastructure: (siteId) => api.get(`/infrastructure/${siteId}`),
  updateInfrastructure: (siteId, data) => api.put(`/infrastructure/${siteId}`, data),
};

// Network API
export const networkAPI = {
  getNetworkDevices: (params) => api.get('/network', { params }),
  scanNetwork: (scanData) => api.post('/network/scan', scanData),
  getNetworkTopology: (siteId) => api.get(`/network/topology/${siteId}`),
};

// Security API
export const securityAPI = {
  getBySite: (siteId) => api.get(`/sites/${siteId}/security`),
  update: (siteId, securityData) => api.put(`/sites/${siteId}/security`, securityData),
  export: (siteId, format) => api.get(`/sites/${siteId}/security/export?format=${format}`),
};

// Interviews API
export const interviewsAPI = {
  getByMission: (missionId) => api.get(`/missions/${missionId}/interviews`),
  getById: (id) => api.get(`/interviews/${id}`),
  create: (interviewData) => api.post('/interviews', interviewData),
  update: (id, interviewData) => api.put(`/interviews/${id}`, interviewData),
  delete: (id) => api.delete(`/interviews/${id}`),
};

// Reports API
export const reportsAPI = {
  getByMission: (missionId) => api.get(`/missions/${missionId}/reports`),
  generate: (missionId, reportData) => api.post(`/missions/${missionId}/reports`, reportData),
  getById: (id) => api.get(`/reports/${id}`),
  download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  send: (id, emailData) => api.post(`/reports/${id}/send`, emailData),
};

// Uploads API
export const uploadsAPI = {
  upload: (file, category, missionId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (missionId) formData.append('mission_id', missionId);
    
    return api.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getByMission: (missionId) => api.get(`/missions/${missionId}/files`),
  delete: (id) => api.delete(`/uploads/${id}`),
};

export default api;
