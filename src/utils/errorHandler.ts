import type { UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Handles API errors globally, sets validation errors to react-hook-form if applicable,
 * and shows toast notifications for general errors.
 * 
 * @param error The error object caught from axios catch block
 * @param setError The setError function from react-hook-form (optional)
 * @param defaultMessage A fallback message if the error doesn't provide one
 */
export const handleApiError = (
  error: any,
  setError?: UseFormSetError<any>,
  defaultMessage: string = 'An error occurred'
) => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // 422 Validation Error
    if (status === 422 && data.errors && setError) {
      const errors = data.errors;
      Object.keys(errors).forEach((key) => {
        setError(key, {
          type: 'server',
          message: errors[key][0],
        });
      });
      toast.error('Gagal menyimpan data. Silakan periksa input Anda.');
      return;
    }

    const errorMessage = data.message || defaultMessage;
    
    if (status !== 401) {
      toast.error(errorMessage);
    }
  } else if (error.request) {
    toast.error('Kesalahan jaringan. Periksa koneksi Anda.');
  } else {
    toast.error(error.message || defaultMessage);
  }
};
