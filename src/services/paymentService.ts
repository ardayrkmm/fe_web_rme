import apiClient from '../api/axios';

export interface PaymentDetail {
  id?: string;
  service_master_id: string;
  service_name?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  invoice_number: string;
  therapy_session_id: string;
  patient_id: string;
  patient_name?: string;
  physiotherapist_id: string;
  physiotherapist_name?: string;
  payment_date: string;
  payment_method: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  share_link?: string;
  payment_details?: PaymentDetail[];
  created_at?: string;
}

export const paymentService = {
  getPayments: async (page = 1, perPage = 10, search = '', status = '', startDate = '', endDate = '') => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      ...(search && { search }),
      ...(status && status !== 'all' && { status }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    });
    const res = await apiClient.get(`/payments?${params.toString()}`);
    return res.data;
  },
  getPayment: async (id: string) => {
    const res = await apiClient.get(`/payments/${id}`);
    return res.data;
  },
  shareInvoice: async (id: string) => {
    const res = await apiClient.post(`/payments/${id}/share`);
    return res.data;
  },
  exportCsv: async (filters: { status?: string; start_date?: string; end_date?: string }) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    const res = await apiClient.get(`/payments/export/csv?${params.toString()}`, { responseType: 'blob' });
    return res.data;
  },
  createPayment: async (data: any) => {
    const res = await apiClient.post('/payments', data);
    return res.data;
  },
  updatePayment: async (id: string, data: any) => {
    const res = await apiClient.put(`/payments/${id}`, data);
    return res.data;
  },
  deletePayment: async (id: string) => {
    const res = await apiClient.delete(`/payments/${id}`);
    return res.data;
  },
  exportCsvUrl: (status = '', paymentMethod = '') => {
    return `${apiClient.defaults.baseURL}/payments/export/csv?status=${status}&payment_method=${paymentMethod}`;
  },
  exportListPdfUrl: (filters: Record<string, string>) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
    return `${apiClient.defaults.baseURL}/payments/export/pdf?${params.toString()}`;
  },
  previewPdfUrl: (id: string) => {
    return `${apiClient.defaults.baseURL}/payments/${id}/pdf/preview`;
  },
  downloadPdfUrl: (id: string) => {
    return `${apiClient.defaults.baseURL}/payments/${id}/pdf/download`;
  },
  previewReceiptUrl: (id: string) => {
    return `${apiClient.defaults.baseURL}/payments/${id}/pdf/receipt/preview`;
  }
};
