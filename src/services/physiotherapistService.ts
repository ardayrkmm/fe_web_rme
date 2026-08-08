import apiClient from '../api/axios';

export const physiotherapistService = {
  getPhysiotherapists: async (page = 1, perPage = 10, search = '') => {
    const res = await apiClient.get(`/physiotherapists?page=${page}&per_page=${perPage}&search=${search}`);
    return res.data;
  },
  getPhysiotherapist: async (id: number) => {
    const res = await apiClient.get(`/physiotherapists/${id}`);
    return res.data;
  },
  createPhysiotherapist: async (data: any) => {
    const res = await apiClient.post('/physiotherapists', data);
    return res.data;
  },
  updatePhysiotherapist: async (id: number, data: any) => {
    const res = await apiClient.put(`/physiotherapists/${id}`, data);
    return res.data;
  },
  restorePhysiotherapist: async (id: number) => {
    const res = await apiClient.post(`/physiotherapists/${id}/restore`);
    return res.data;
  },
  exportCsv: async (search = '', status = '') => {
    const res = await apiClient.get(`/physiotherapists/export/csv?search=${search}&status=${status}`, {
      responseType: 'blob'
    });
    return res.data;
  },
  deletePhysiotherapist: async (id: number) => {
    const res = await apiClient.delete(`/physiotherapists/${id}`);
    return res.data;
  }
};
