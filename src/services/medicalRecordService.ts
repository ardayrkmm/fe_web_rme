import apiClient from '../api/axios';

export const medicalRecordService = {
  getMedicalRecords: async (page = 1, perPage = 10, search = '') => {
    const res = await apiClient.get(`/medical-records?page=${page}&per_page=${perPage}&search=${search}`);
    return res.data;
  },
  getMedicalRecord: async (id: number) => {
    const res = await apiClient.get(`/medical-records/${id}`);
    return res.data;
  },
  createMedicalRecord: async (data: any) => {
    const res = await apiClient.post('/medical-records', data);
    return res.data;
  },
  updateMedicalRecord: async (id: number, data: any) => {
    const res = await apiClient.put(`/medical-records/${id}`, data);
    return res.data;
  },
  deleteMedicalRecord: async (id: number) => {
    const res = await apiClient.delete(`/medical-records/${id}`);
    return res.data;
  },
  getPatientHistory: async (patientId: number) => {
    const res = await apiClient.get(`/patients/${patientId}/medical-records`);
    return res.data;
  }
};
