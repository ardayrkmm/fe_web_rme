import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '../../services/patientService';
import { medicalRecordService } from '../../services/medicalRecordService';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Plus, Pencil, Trash2, Search, Download, Users, FileText, ClipboardList, Calendar, Stethoscope, User, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { PatientForm } from './PatientForm';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/errorHandler';
import { downloadBlob, exportToPDF } from '../../utils/exportUtils';
import { ExportPdfDialog } from '../../components/ExportPdfDialog';

interface Patient {
  id: number;
  medical_record_number: string;
  name: string;
  nik: string;
  phone: string;
  address: string;
  gender: string;
  category: string;
  birth_date: string;
  age: number;
  marital_status: string;
  occupation: string;
}

export default function Patients() {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  // Riwayat RM Dialog state
  const [isRmDialogOpen, setIsRmDialogOpen] = useState(false);
  const [selectedPatientForRm, setSelectedPatientForRm] = useState<any>(null);

  const pageSize = 10;

  // Fetch riwayat RM when dialog is open
  const { data: rmData, isLoading: isRmLoading } = useQuery({
    queryKey: ['patient-rm-history', selectedPatientForRm?.id],
    queryFn: () => medicalRecordService.getPatientHistory(selectedPatientForRm?.id),
    enabled: !!selectedPatientForRm?.id && isRmDialogOpen,
  });

  const rmRecords: any[] = Array.isArray(rmData?.data) ? rmData.data : [];

  const handleOpenRmDialog = (patient: any) => {
    setSelectedPatientForRm(patient);
    setIsRmDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await patientService.exportCsv(search);
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(blob, `patients_${date}.csv`);
      toast.success('File CSV berhasil diunduh');
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengunduh file CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async (mode: 'all' | 'month', monthStr?: string) => {
    try {
      setIsExportingPDF(true);
      const res = await patientService.getPatients(1, 1000, search);
      let records = res.data?.data || [];
      
      // Filter by month if selected
      if (mode === 'month' && monthStr) {
        const [year, month] = monthStr.split('-');
        records = records.filter((r: any) => {
          if (!r.created_at) return false;
          const date = new Date(r.created_at);
          return date.getFullYear().toString() === year && 
                 String(date.getMonth() + 1).padStart(2, '0') === month;
        });
        
        if (records.length === 0) {
          toast.error('Tidak ada data pasien pada bulan tersebut');
          return;
        }
      }
      
      const pdfColumns = ['No. RM', 'Kategori', 'Nama Pasien', 'L/P', 'Status', 'Tgl Lahir', 'Usia', 'Pekerjaan', 'No. Identitas'];
      const rowData = records.map((r: any) => {
        let age = '- thn';
        if (r.birth_date) {
          age = `${new Date().getFullYear() - new Date(r.birth_date).getFullYear()} thn`;
        }
        
        const cat = categoriesData?.data?.find((c: any) => String(c.id) === String(r.patient_category_id));
        const categoryName = cat ? cat.name : '-';
        
        const gen = gendersData?.data?.find((g: any) => String(g.id) === String(r.gender_id));
        const genderName = gen ? gen.name : (r.gender || '-');
        
        const birthDateFormatted = r.birth_date ? new Date(r.birth_date).toLocaleDateString('id-ID') : '-';

        return [
          r.medical_record_number || '-', 
          categoryName,
          r.name, 
          genderName,
          r.marital_status || '-',
          birthDateFormatted,
          age,
          r.occupation || '-',
          r.nik || '-'
        ];
      });
      
      const titleSuffix = (() => {
        if (mode === 'month' && monthStr) {
          const [y, m] = monthStr.split('-');
          const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          return ` - BULAN ${monthNames[parseInt(m) - 1].toUpperCase()} ${y}`;
        }
        return '';
      })();
      exportToPDF(`Data Pasien${titleSuffix}`, pdfColumns, rowData);
      setIsPdfDialogOpen(false);
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['patients', pageIndex, search],
    queryFn: () => patientService.getPatients(pageIndex + 1, pageSize, search),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => patientService.getCategories(),
  });

  const { data: gendersData } = useQuery({
    queryKey: ['genders-list'],
    queryFn: () => patientService.getGenders(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => patientService.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Pasien berhasil dihapus');
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus data pasien ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<Patient>[] = [
    { accessorKey: 'medical_record_number', header: 'No. RM', cell: ({ row }) => row.original.medical_record_number || '-' },
    { 
      accessorKey: 'category', 
      header: 'Kategori',
      cell: ({ row }) => {
        const catId = (row.original as any).patient_category_id;
        if (!catId) return '-';
        const cat = categoriesData?.data?.find((c: any) => String(c.id) === String(catId));
        return cat ? cat.name : '-';
      }
    },
    { accessorKey: 'name', header: 'Nama Pasien' },
    { 
      accessorKey: 'gender', 
      header: 'L/P',
      cell: ({ row }) => {
        const genId = (row.original as any).gender_id;
        if (!genId) return '-';
        const gen = gendersData?.data?.find((g: any) => String(g.id) === String(genId));
        return gen ? (gen.name === 'Laki-Laki' || gen.name === 'L' ? 'L' : 'P') : '-';
      }
    },
    { accessorKey: 'marital_status', header: 'Status', cell: ({ row }) => row.original.marital_status || '-' },
    { 
      accessorKey: 'birth_date', 
      header: 'Tanggal Lahir', 
      cell: ({ row }) => row.original.birth_date ? new Date(row.original.birth_date).toLocaleDateString('id-ID') : '-' 
    },
    { 
      accessorKey: 'age', 
      header: 'Usia', 
      cell: ({ row }) => {
        if (!row.original.birth_date) return '- thn';
        const age = new Date().getFullYear() - new Date(row.original.birth_date).getFullYear();
        return `${age} thn`;
      } 
    },
    { accessorKey: 'occupation', header: 'Pekerjaan', cell: ({ row }) => row.original.occupation || '-' },
    { accessorKey: 'nik', header: 'No. Identitas', cell: ({ row }) => row.original.nik || '-' },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
            onClick={() => handleOpenRmDialog(row.original)}
          >
            Riwayat RM
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-blue-600"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-red-600"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const patients = data?.data?.data || [];
  
  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.data?.last_page || -1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Data Pasien</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPdfDialogOpen(true)}
          >
            <FileText className="w-4 h-4 mr-2" />
            Cetak PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pasien
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Cari pasien..." 
                className="pl-8" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-5 bg-slate-100 rounded-md animate-pulse"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-2">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-medium text-slate-900">Data pasien tidak ditemukan</p>
                      <p className="text-sm">Mulai dengan menambahkan pasien baru.</p>
                      <Button onClick={handleAdd} variant="outline" className="mt-2 text-primary border-primary/20 hover:bg-primary/5">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Pasien
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-end space-x-2 p-4 border-t">
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
              disabled={pageIndex >= (data?.data?.last_page || 1) - 1}
            >
              Berikutnya
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Tambah/Edit Pasien */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Ubah Pasien' : 'Tambah Pasien Baru'}</DialogTitle>
          </DialogHeader>
          <PatientForm 
            initialData={editingPatient} 
            onSuccess={() => setIsDialogOpen(false)}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Riwayat Rekam Medis */}
      <Dialog open={isRmDialogOpen} onOpenChange={setIsRmDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">Riwayat Rekam Medis</DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedPatientForRm?.name || 'Pasien'} — {selectedPatientForRm?.medical_record_number || '-'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 -mr-1">
            {isRmLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Memuat riwayat rekam medis...</p>
              </div>
            ) : rmRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-base font-medium text-slate-500">Belum ada riwayat</p>
                <p className="text-sm mt-1">Pasien ini belum memiliki rekam medis.</p>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {rmRecords.map((record: any, idx: number) => (
                  <div 
                    key={record.id || idx} 
                    className="border border-slate-200 rounded-xl p-4 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-200"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold">
                          <ClipboardList className="w-3 h-3" />
                          {record.visit_number || `Kunjungan ${idx + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {record.examination_date 
                          ? new Date(record.examination_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
                          : '-'}
                      </div>
                    </div>

                    {/* Info row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-500">
                      {record.physiotherapist?.name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {record.physiotherapist.name}
                        </span>
                      )}
                      {record.service?.name && (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          {record.service.name}
                        </span>
                      )}
                    </div>

                    {/* Content grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {record.anamnesis && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Anamnesis</p>
                          <p className="text-slate-700 leading-relaxed">{record.anamnesis}</p>
                        </div>
                      )}
                      {record.diagnosis && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</p>
                          <p className="text-slate-700 leading-relaxed">{record.diagnosis}</p>
                        </div>
                      )}
                      {record.therapy && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Terapi</p>
                          <p className="text-slate-700 leading-relaxed">{record.therapy}</p>
                        </div>
                      )}
                      {record.notes && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Catatan</p>
                          <p className="text-slate-700 leading-relaxed">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer summary */}
          {rmRecords.length > 0 && (
            <div className="pt-3 border-t mt-2 text-xs text-slate-400 text-center">
              Total {rmRecords.length} kunjungan tercatat
            </div>
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
