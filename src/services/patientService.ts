import apiClient from '../api/axios';

export const patientService = {
  getPatients: async (page = 1, perPage = 10, search = '') => {
    const res = await apiClient.get(`/patients?page=${page}&per_page=${perPage}&search=${search}`);
    return res.data;
  },
  getPatient: async (id: number) => {
    const res = await apiClient.get(`/patients/${id}`);
    return res.data;
  },
  createPatient: async (data: any) => {
    const res = await apiClient.post('/patients', data);
    return res.data;
  },
  updatePatient: async (id: number, data: any) => {
    const res = await apiClient.put(`/patients/${id}`, data);
    return res.data;
  },
  deletePatient: async (id: number) => {
    const res = await apiClient.delete(`/patients/${id}`);
    return res.data;
  },

  getCategories: async () => {
    const res = await apiClient.get('/patient-categories');
    return res.data;
  },
  createCategory: async (data: { name: string }) => {
    const res = await apiClient.post('/patient-categories', data);
    return res.data;
  },
  getGenders: async () => {
    const res = await apiClient.get('/genders');
    return res.data;
  }
};
