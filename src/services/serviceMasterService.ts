import apiClient from '../api/axios';

export interface ServiceMaster {
  id: number;
  name: string;
  code: string;
  category: string;
  duration: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const serviceMasterService = {
  getServices: async (page = 1, perPage = 10, search = '') => {
    const res = await apiClient.get(`/service-masters?page=${page}&per_page=${perPage}&search=${search}`);
    return res.data;
  },
  getService: async (id: number) => {
    const res = await apiClient.get(`/service-masters/${id}`);
    return res.data;
  },
  createService: async (data: Partial<ServiceMaster>) => {
    const res = await apiClient.post('/service-masters', data);
    return res.data;
  },
  updateService: async (id: number, data: Partial<ServiceMaster>) => {
    const res = await apiClient.put(`/service-masters/${id}`, data);
    return res.data;
  },
  deleteServiceMaster: async (id: number) => {
    const res = await apiClient.delete(`/service-masters/${id}`);
    return res.data;
  },

};
