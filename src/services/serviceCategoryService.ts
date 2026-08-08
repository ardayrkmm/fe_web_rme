import apiClient from '../api/axios';

export const serviceCategoryService = {
  getCategories: async (page = 1, perPage = 100) => {
    const res = await apiClient.get(`/service-categories?page=${page}&per_page=${perPage}`);
    return res.data;
  },
  getCategory: async (id: string) => {
    const res = await apiClient.get(`/service-categories/${id}`);
    return res.data;
  },
  createCategory: async (data: { name: string }) => {
    const res = await apiClient.post('/service-categories', data);
    return res.data;
  },
  updateCategory: async (id: string, data: { name: string }) => {
    const res = await apiClient.put(`/service-categories/${id}`, data);
    return res.data;
  },
  deleteCategory: async (id: string) => {
    const res = await apiClient.delete(`/service-categories/${id}`);
    return res.data;
  }
};
