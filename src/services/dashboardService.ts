import apiClient from '../api/axios';

export const dashboardService = {
  getDashboardSummary: async () => {
    // Memanggil endpoint admin dashboard
    const res = await apiClient.get('/dashboard/admin');
    return res.data;
  }
};
