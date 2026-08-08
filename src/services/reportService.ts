import apiClient from '../api/axios';

export const reportService = {
  getDashboardStats: async () => {
    const res = await apiClient.get('/reports/dashboard');
    return res.data;
  },
};
