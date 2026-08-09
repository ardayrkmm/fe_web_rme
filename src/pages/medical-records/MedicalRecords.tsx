import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { useReactToPrint } from 'react-to-print';
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
import { Plus, Printer, Trash2, Search, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { MedicalRecordForm } from './MedicalRecordForm';
import { PrintableMedicalRecord } from './PrintableMedicalRecord';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/errorHandler';
import { exportToPDF } from '../../utils/exportUtils';
import { ExportPdfDialog } from '../../components/ExportPdfDialog';
import { FileText } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface MedicalRecord {
  id: number;
  visit_number: string | null;
  patient: { id: number; name: string; medical_record_number: string } | null;
  physiotherapist: { id: number; name: string } | null;
  service: { id: number; name: string } | null;
  examination_date: string;
  anamnesis: string;
  diagnosis: string;
  therapy: string;
}

export default function MedicalRecords() {
  const { user } = useAuthStore();
  const isPhysio = user?.role?.toLowerCase() === 'fisioterapis';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [printRecord, setPrintRecord] = useState<any>(null);
  const [printRecords, setPrintRecords] = useState<any[] | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<any>(null);
  const printComponentRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;
  const location = useLocation();

  // Capture filter values into stable React state on mount / navigation
  const [filterPatientId, setFilterPatientId] = useState<string | null>(
    location.state?.filterPatientId ?? null
  );
  const [filterPatientName, setFilterPatientName] = useState<string | null>(
    location.state?.filterPatientName ?? null
  );

  useEffect(() => {
    // Update filter state when navigating with new location state
    if (location.state?.filterPatientId) {
      setFilterPatientId(location.state.filterPatientId);
      setFilterPatientName(location.state.filterPatientName ?? null);
    }

    // Dari TherapySessions: fisioterapis klik "Riwayat RM Pasien"
    if (location.state?.viewHistoryPatientId) {
      setFilterPatientId(location.state.viewHistoryPatientId);
      setFilterPatientName(location.state.viewHistoryPatientName ?? null);
    }

    if (location.state?.createFromAppointment) {
      setPrefillData(location.state.createFromAppointment);
      setEditingRecord(null);
      setIsDialogOpen(true);
    }

    // Clean up navigation state so it doesn't replay on refresh,
    // but our React state already captured the values we need.
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleDownloadPDF = () => {
    const element = printComponentRef.current;
    if (!element) return;
    
    const isHistory = printRecords && printRecords.length > 0;
    const fileName = isHistory 
      ? `Riwayat_Medis_${printRecords[0]?.patient_name || 'Pasien'}.pdf`
      : `Rekam_Medis_${printRecord?.patient_name || 'Pasien'}.pdf`;

    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['medical-records', pageIndex, search, filterPatientId],
    queryFn: () => filterPatientId 
      ? medicalRecordService.getPatientHistory(filterPatientId)
      : medicalRecordService.getMedicalRecords(pageIndex + 1, pageSize, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => medicalRecordService.deleteMedicalRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      toast.success('Rekam medis berhasil dihapus');
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const handlePrintHistory = () => {
    let records = Array.isArray(data?.data?.data) ? data.data.data :
                  Array.isArray(data?.data) ? data.data :
                  Array.isArray(data) ? data : [];
    if (records.length === 0) {
      toast.error('Tidak ada rekam medis untuk dicetak');
      return;
    }
    setPrintRecords(records);
    setPrintRecord(null);
    setIsPrintDialogOpen(true);
  };

  const handleExportPDF = async (mode: 'all' | 'month', monthStr?: string) => {
    try {
      setIsExportingPDF(true);
      const res = await medicalRecordService.getMedicalRecords(1, 1000, search);
      
      let records = Array.isArray(res?.data?.data) ? res.data.data :
                      Array.isArray(res?.data) ? res.data :
                      Array.isArray(res) ? res : [];
                      
      if (mode === 'month' && monthStr) {
        const [year, month] = monthStr.split('-');
        records = records.filter((r: any) => {
          if (!r.examination_date) return false;
          const date = new Date(r.examination_date);
          return date.getFullYear().toString() === year && 
                 String(date.getMonth() + 1).padStart(2, '0') === month;
        });
        
        if (records.length === 0) {
          toast.error('Tidak ada data rekam medis pada bulan tersebut');
          return;
        }
      }
      
      const pdfColumns = ['No Kunjungan', 'No RekamMedis', 'Nama pasien', 'tgl Pemeriksaan', 'Jenis layanan', 'Fisioterapisnya'];
      const rowData = records.map((r: any) => [
        r.visit_number || '-',
        r.patient?.medical_record_number || '-',
        r.patient?.name || '-',
        r.examination_date ? new Date(r.examination_date).toLocaleDateString('id-ID') : '-',
        r.service?.name || '-',
        r.physiotherapist?.name || '-'
      ]);
      
      const titleSuffix = (() => {
        if (mode === 'month' && monthStr) {
          const [y, m] = monthStr.split('-');
          const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          return ` - BULAN ${monthNames[parseInt(m) - 1].toUpperCase()} ${y}`;
        }
        return '';
      })();
      exportToPDF(`Data Rekam Medis${titleSuffix}`, pdfColumns, rowData);
      setIsPdfDialogOpen(false);
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus data rekam medis ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDetail = (record: any) => {
    setPrintRecord(record);
    setPrintRecords(null);
    setIsPrintDialogOpen(true);
  };

  const handleAdd = () => {
    setPrefillData(null);
    setEditingRecord(null);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<MedicalRecord>[] = [
    { 
      accessorKey: 'visit_number', 
      header: 'No Kunjungan',
      cell: ({ row }) => row.original.visit_number || '-'
    },
    { 
      accessorKey: 'patient.medical_record_number', 
      header: 'No RekamMedis',
      cell: ({ row }) => row.original.patient?.medical_record_number || '-'
    },
    { 
      accessorKey: 'patient.name', 
      header: 'Nama pasien',
      cell: ({ row }) => row.original.patient?.name || '-'
    },
    { 
      accessorKey: 'examination_date', 
      header: 'tgl Pemeriksaan',
      cell: ({ row }) => {
        const d = row.original.examination_date;
        return d ? new Date(d).toLocaleDateString('id-ID') : '-';
      }
    },
    { 
      accessorKey: 'service.name', 
      header: 'Jenis layanan',
      cell: ({ row }) => row.original.service?.name || '-'
    },
    { 
      accessorKey: 'physiotherapist.name', 
      header: 'Fisioterapisnya',
      cell: ({ row }) => row.original.physiotherapist?.name || '-'
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 text-blue-600"
            onClick={() => handleDetail(row.original)}
            title="Detail & Cetak"
          >
            <Printer className="h-4 w-4" />
          </Button>
          {!isPhysio && (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 text-red-600"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const isHistoryMode = !!filterPatientId;
  const records = isHistoryMode 
    ? (Array.isArray(data?.data) ? data.data : []) 
    : (data?.data?.data || []);
  
  const pageCount = isHistoryMode ? 1 : (data?.data?.last_page || -1);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !isHistoryMode,
    pageCount: pageCount,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isHistoryMode ? `Riwayat Rekam Medis: ${filterPatientName || 'Pasien'}` : 'Rekam Medis'}
          </h1>
          {isHistoryMode && (
            <p className="text-sm text-slate-500 mt-1">
              Menampilkan seluruh riwayat kunjungan khusus untuk pasien ini
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isHistoryMode && (
            <Button variant="outline" onClick={() => {
              setFilterPatientId(null);
              setFilterPatientName(null);
              if (isPhysio) navigate('/therapy-sessions');
              else navigate('/patients');
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
          )}
          {isHistoryMode ? (
            <Button variant="outline" onClick={handlePrintHistory}>
              <Printer className="w-4 h-4 mr-2" /> Cetak Riwayat
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsPdfDialogOpen(true)}>
              <FileText className="w-4 h-4 mr-2" /> Cetak PDF
            </Button>
          )}
          {!isHistoryMode && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Rekam Medis
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            {!isHistoryMode ? (
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari pasien atau RM..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            ) : (
              <div></div>
            )}
            {!isHistoryMode && (
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Tambah Rekam Medis
              </Button>
            )}
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
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Memuat rekam medis...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Data tidak ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <div>
              Menampilkan {table.getRowModel().rows.length} dari {isHistoryMode ? records.length : (data?.data?.total || 0)} data
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isHistoryMode) table.previousPage();
                  else setPageIndex((p) => Math.max(0, p - 1));
                }}
                disabled={isHistoryMode ? !table.getCanPreviousPage() : pageIndex === 0}
              >
                Sebelumnya
              </Button>
              <div className="flex items-center px-4 font-medium">
                Halaman {isHistoryMode ? table.getState().pagination.pageIndex + 1 : pageIndex + 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isHistoryMode) table.nextPage();
                  else setPageIndex((p) => p + 1);
                }}
                disabled={isHistoryMode ? !table.getCanNextPage() : pageIndex >= (data?.data?.last_page || 1) - 1}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Rekam Medis' : 'Tambah Rekam Medis'}
            </DialogTitle>
          </DialogHeader>
          <MedicalRecordForm
            initialData={editingRecord}
            prefillData={prefillData}
            onSuccess={() => setIsDialogOpen(false)}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between mt-4">
            <DialogTitle>
              {printRecords && printRecords.length > 0 ? 'Cetak Riwayat Pasien' : 'Detail Rekam Medis'}
            </DialogTitle>
            <Button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </DialogHeader>
          <div className="border border-slate-200 mt-4 rounded overflow-hidden">
            <PrintableMedicalRecord 
              ref={printComponentRef} 
              record={printRecord} 
              records={printRecords || undefined} 
            />
          </div>
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
