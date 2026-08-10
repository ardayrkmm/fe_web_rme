import apiClient from '../api/axios';

export const dashboardService = {
  getDashboardSummary: async () => {
    // Memanggil endpoint admin dashboard
    const res = await apiClient.get('/dashboard/admin');
    return res.data;
  },
  getFisioDashboard: async () => {
    // Memanggil endpoint fisio dashboard
    const res = await apiClient.get('/dashboard/fisio');
    return res.data;
  }
};
