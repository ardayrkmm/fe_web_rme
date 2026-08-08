import apiClient from '../api/axios';

export const dashboardService = {
  getDashboardSummary: async () => {
    const res = await apiClient.get('/dashboard');
    return res.data;
  }
};
