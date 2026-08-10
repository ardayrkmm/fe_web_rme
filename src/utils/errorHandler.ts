import type { UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Transforms raw, technical backend errors into user-friendly Indonesian messages.
 */
const getUserFriendlyMessage = (rawMessage: string, defaultMessage: string): string => {
  if (!rawMessage || typeof rawMessage !== 'string') return defaultMessage;
  
  const lowerMsg = rawMessage.toLowerCase();
  
  if (lowerMsg.includes('duplicate entry') || lowerMsg.includes('1062')) {
    return 'Data yang Anda masukkan sudah terdaftar di sistem (Duplikat).';
  }
  
  if (lowerMsg.includes('foreign key constraint fails') || lowerMsg.includes('1451') || lowerMsg.includes('cannot delete or update a parent row')) {
    return 'Data ini tidak dapat dihapus karena masih terhubung dengan riwayat atau data lain.';
  }
  
  if (lowerMsg.includes('connection refused') || lowerMsg.includes('dial tcp') || lowerMsg.includes('too many connections')) {
    return 'Sedang terjadi gangguan koneksi ke server. Silakan coba beberapa saat lagi.';
  }
  
  if (lowerMsg.includes('sql') || lowerMsg.includes('mysql') || lowerMsg.includes('syntax') || lowerMsg.includes('unknown column') || lowerMsg.includes('table')) {
    return 'Terjadi kesalahan sistem saat memproses data. Silakan hubungi tim teknis.';
  }

  if (lowerMsg.includes('not found') || lowerMsg.includes('record not found')) {
    return 'Data yang Anda tuju tidak ditemukan di dalam sistem.';
  }

  if (lowerMsg.includes('required')) {
    return 'Pastikan semua kolom yang wajib diisi sudah terisi dengan benar.';
  }

  if (lowerMsg.includes('data truncated') || lowerMsg.includes('out of range')) {
    return 'Isian data Anda tidak valid atau terlalu panjang.';
  }

  if (lowerMsg.includes('jwt') || lowerMsg.includes('token') || lowerMsg.includes('unauthorized') || lowerMsg.includes('invalid credentials')) {
    return 'Akses ditolak atau sesi telah berakhir. Silakan periksa kredensial atau login ulang.';
  }

  // If it's a long stack trace or contains error prefix
  if (rawMessage.length > 100 || lowerMsg.includes('panic') || lowerMsg.includes('error:')) {
    return 'Terjadi kesalahan sistem yang tidak terduga. Silakan coba lagi.';
  }

  return rawMessage;
};

/**
 * Handles API errors globally, sets validation errors to react-hook-form if applicable,
 * and shows toast notifications for general errors.
 */
export const handleApiError = (
  error: any,
  setError?: UseFormSetError<any>,
  defaultMessage: string = 'Terjadi kesalahan pada sistem'
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
      toast.error('Gagal menyimpan data. Silakan periksa kembali isian form Anda.');
      return;
    }

    const rawMessage = data.message || data.error || defaultMessage;
    const errorMessage = getUserFriendlyMessage(rawMessage, defaultMessage);
    
    if (status !== 401) {
      toast.error(errorMessage);
    } else {
      toast.error(errorMessage);
    }
  } else if (error.request) {
    toast.error('Kesalahan jaringan. Mohon periksa koneksi internet Anda.');
  } else {
    toast.error(getUserFriendlyMessage(error.message, defaultMessage));
  }
};
