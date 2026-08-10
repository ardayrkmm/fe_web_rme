import apiClient from '../api/axios';

export const appointmentService = {
  getAppointments: async (page = 1, perPage = 10, search = '', status?: string, start_date?: string, end_date?: string, patient_id?: string, physiotherapist_id?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      ...(search && { search }),
      ...(status && { status }),
      ...(start_date && { start_date }),
      ...(end_date && { end_date }),
      ...(patient_id && { patient_id }),
      ...(physiotherapist_id && { physiotherapist_id }),
    });
    const res = await apiClient.get(`/appointments?${params.toString()}`);
    return res.data;
  },
  getAppointment: async (id: number) => {
    const res = await apiClient.get(`/appointments/${id}`);
    return res.data;
  },
  createAppointment: async (data: any) => {
    const res = await apiClient.post('/appointments', data);
    return res.data;
  },
  updateAppointment: async (id: number, data: any) => {
    const res = await apiClient.put(`/appointments/${id}`, data);
    return res.data;
  },
  updateStatus: async (id: number, status: string) => {
    const res = await apiClient.put(`/appointments/${id}`, { status });
    return res.data;
  },
  deleteAppointment: async (id: number) => {
    const res = await apiClient.delete(`/appointments/${id}`);
    return res.data;
  },
  cancelAppointment: async (id: number) => {
    const res = await apiClient.post(`/appointments/${id}/cancel`);
    return res.data;
  }
};
