import apiClient from '../api/axios';

export const therapySessionService = {
  getTherapySessions: async (page = 1, perPage = 10, search = '', start_date?: string, end_date?: string, patient_id?: string, physiotherapist_id?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      ...(search && { search }),
      ...(start_date && { start_date }),
      ...(end_date && { end_date }),
      ...(patient_id && { patient_id }),
      ...(physiotherapist_id && { physiotherapist_id }),
    });
    const res = await apiClient.get(`/therapy-sessions?${params.toString()}`);
    return res.data;
  },
  getScheduleByDate: async (date: string) => {
    const res = await apiClient.get('/therapy-sessions/schedule', {
      params: { date }
    });
    return res.data;
  },
  getWeeklySchedule: async (start_date: string, end_date: string) => {
    const res = await apiClient.get('/therapy-sessions/weekly-schedule', {
      params: { start_date, end_date }
    });
    return res.data;
  },
  getTherapySession: async (id: number) => {
    const res = await apiClient.get(`/therapy-sessions/${id}`);
    return res.data;
  },
  createTherapySession: async (data: any) => {
    const res = await apiClient.post('/therapy-sessions', data);
    return res.data;
  },
  updateTherapySession: async (id: number, data: any) => {
    const res = await apiClient.put(`/therapy-sessions/${id}`, data);
    return res.data;
  },
  deleteTherapySession: async (id: number) => {
    const res = await apiClient.delete(`/therapy-sessions/${id}`);
    return res.data;
  }
};
