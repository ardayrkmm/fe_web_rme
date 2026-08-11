import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../services/appointmentService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Plus, Search, MoreVertical, Edit, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentForm } from './AppointmentForm';
import { useAuthStore } from '../../store/useAuthStore';
import { exportToPDF, exportToExcelStyled } from '../../utils/exportUtils';
import { handleApiError } from '../../utils/errorHandler';
import { ExportPdfDialog } from '../../components/ExportPdfDialog';

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isPhysio = user?.role === 'fisioterapis';
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset page to 0 when search term changes
  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (location.state?.createFromPatientId) {
      setSelectedAppointment({ patient_id: location.state.createFromPatientId });
      setIsFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['appointments', searchTerm],
    queryFn: () => appointmentService.getAppointments(1, 100, searchTerm),
    refetchInterval: 3000, // Near-realtime polling every 3 seconds
  });

  const rawAppointments = Array.isArray(response?.data?.data) ? response.data.data :
                       Array.isArray(response?.data) ? response.data :
                       Array.isArray(response) ? response : [];

  // Deduplicate appointments by date, time, and physiotherapist, keeping the newest one
  const appointmentsMap = new Map();
  rawAppointments.forEach((apt: any) => {
    const aptDateStr = apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString('en-CA') : 'unknown';
    const key = `${aptDateStr}_${apt.appointment_time}_${apt.physiotherapist_id}`;
    
    if (!appointmentsMap.has(key)) {
      appointmentsMap.set(key, apt);
    } else {
      const existing = appointmentsMap.get(key);
      const existingDate = new Date(existing.created_at || 0).getTime();
      const newDate = new Date(apt.created_at || 0).getTime();
      if (newDate > existingDate) {
        appointmentsMap.set(key, apt);
      }
    }
  });
  
  // Sort back by created_at desc so newest appears at the top
  const appointments = Array.from(appointmentsMap.values()).sort((a: any, b: any) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const paginatedAppointments = appointments.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const deleteMutation = useMutation({
    mutationFn: appointmentService.deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Janji terapi berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus janji terapi'),
  });

  const handleEdit = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus janji terapi ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportPDF = async (mode: 'all' | 'month', monthStr?: string) => {
    try {
      setIsExportingPDF(true);
      const res = await appointmentService.getAppointments(1, 1000, searchTerm);
      
      let records = Array.isArray(res?.data?.data) ? res.data.data :
                      Array.isArray(res?.data) ? res.data :
                      Array.isArray(res) ? res : [];
                      
      if (mode === 'month' && monthStr) {
        const [year, month] = monthStr.split('-');
        records = records.filter((r: any) => {
          if (!r.appointment_date) return false;
          const date = new Date(r.appointment_date);
          return date.getFullYear().toString() === year && 
                 String(date.getMonth() + 1).padStart(2, '0') === month;
        });
        
        if (records.length === 0) {
          toast.error('Tidak ada data janji terapi pada bulan tersebut');
          return;
        }
      }
      
      const columns = ['Tanggal', 'Waktu', 'Pasien', 'Fisioterapis', 'Status', 'Keluhan Utama'];
      const rowData = records.map((r: any) => [
        r.appointment_date ? new Date(r.appointment_date).toLocaleDateString('id-ID') : '-', 
        r.appointment_time || '-', 
        r.patient?.name || '-', 
        r.physiotherapist?.name || '-', 
        r.status || '-',
        r.main_complaint || '-'
      ]);
      
      const titleSuffix = (() => {
        if (mode === 'month' && monthStr) {
          const [y, m] = monthStr.split('-');
          const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          return ` - BULAN ${monthNames[parseInt(m) - 1].toUpperCase()} ${y}`;
        }
        return '';
      })();
      exportToPDF(`Data Janji Terapi${titleSuffix}`, columns, rowData);
      setIsPdfDialogOpen(false);
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const res = await appointmentService.getAppointments(1, 1000, searchTerm);
      const records = Array.isArray(res?.data?.data) ? res.data.data :
                      Array.isArray(res?.data) ? res.data :
                      Array.isArray(res) ? res : [];
      if (records.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }
      
      const rows = records.map((r: any, index: number) => ({
        'No': index + 1,
        'Tanggal': r.appointment_date ? new Date(r.appointment_date).toLocaleDateString('id-ID') : '-',
        'Waktu': r.appointment_time || '-',
        'Pasien': r.patient?.name || '-',
        'Fisioterapis': r.physiotherapist?.name || '-',
        'Layanan': r.service_master?.name || '-',
        'Status': r.status || '-',
        'Keluhan Utama': r.main_complaint || '-'
      }));
      
      const date = new Date().toISOString().split('T')[0];
      await exportToExcelStyled('Arummy Fisioterapi', 'Data Janji Terapi', rows, `janji_terapi_${date}.xlsx`);
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor file Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'approved': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Disetujui</Badge>;
      case 'telah_tiba': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Telah Tiba</Badge>;
      case 'scheduled': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Terjadwal</Badge>;
      case 'ongoing': return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Sedang Berlangsung</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-700 border-red-200">Dibatalkan</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-700 border-green-200">Selesai</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Janji Terapi</h1>
          <p className="text-slate-500">Kelola riwayat dan daftar janji terapi pasien</p>
        </div>
        {!isPhysio && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPdfDialogOpen(true)}>
              <FileText className="w-4 h-4 mr-2" /> Cetak PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={isExportingExcel}>
              <FileText className="w-4 h-4 mr-2" /> Excel
            </Button>
          </div>
        )}
        {isPhysio && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPdfDialogOpen(true)}>
              <FileText className="w-4 h-4 mr-2" /> Cetak PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={isExportingExcel}>
              <FileText className="w-4 h-4 mr-2" /> Excel
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-md bg-white p-2 rounded-lg border shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <Input 
          type="text" 
          placeholder="Cari pasien atau fisioterapis..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none px-2"
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Tanggal & Waktu</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Fisioterapis</TableHead>
              <TableHead>Layanan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Memuat data...</TableCell>
              </TableRow>
            ) : paginatedAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Tidak ada data janji terapi.</TableCell>
              </TableRow>
            ) : (
              paginatedAppointments.map((appointment: any) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="font-medium text-slate-800">
                      {new Date(appointment.appointment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-slate-500">{appointment.appointment_time?.substring(0, 5) || '-'}</div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{appointment.patient?.name || '-'}</TableCell>
                  <TableCell>{appointment.physiotherapist?.name || '-'}</TableCell>
                  <TableCell>{appointment.service_master?.name || '-'}</TableCell>
                  <TableCell>{getStatusBadge(appointment.therapy_session ? appointment.therapy_session.status : appointment.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-slate-100 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((old) => Math.max(old - 1, 0))}
            disabled={pageIndex === 0}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((old) => old + 1)}
            disabled={pageIndex >= Math.ceil(appointments.length / pageSize) - 1 || appointments.length === 0}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAppointment ? 'Edit Janji Terapi' : 'Tambah Janji Terapi'}</DialogTitle>
          </DialogHeader>
          {isFormOpen && (
            <AppointmentForm
              initialData={selectedAppointment}
              onSuccess={() => {
                setIsFormOpen(false);
                queryClient.invalidateQueries({ queryKey: ['appointments'] });
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <ExportPdfDialog 
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
        onExport={handleExportPDF}
        isExporting={isExportingPDF}
      />
    </div>
  );
}
