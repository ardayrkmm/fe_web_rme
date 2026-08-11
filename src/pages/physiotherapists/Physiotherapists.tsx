import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { physiotherapistService } from '../../services/physiotherapistService';
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
import { Plus, Pencil, Trash2, Search, Download, FileText } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { PhysiotherapistForm } from './PhysiotherapistForm';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/errorHandler';
import { downloadBlob, exportToPDF, exportToExcelStyled } from '../../utils/exportUtils';
import { ExportPdfDialog } from '../../components/ExportPdfDialog';

interface Physiotherapist {
  id: number;
  name: string;
  specialization: string;
  sip: string;
  phone: string;
  status: string;
  email: string;
  address: string;
  gender: string;
}

export default function Physiotherapists() {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhysiotherapist, setEditingPhysiotherapist] = useState<Physiotherapist | null>(null);
  const [editingData, setEditingData] = useState<Physiotherapist | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const pageSize = 10;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await physiotherapistService.getPhysiotherapists(1, 1000, search);
      const records = res.data?.data || [];
      if (records.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }
      
      const rows = records.map((r: any, index: number) => ({
        'No': index + 1,
        'Nama': r.name,
        'Spesialisasi': r.specialization || '-',
        'SIP': r.sip || '-',
        'Telepon': r.phone || '-',
        'Email': r.email || '-',
        'Status': r.status === 'active' || r.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'
      }));
      
      const date = new Date().toISOString().split('T')[0];
      await exportToExcelStyled('Arummy Fisioterapi', 'Data Fisioterapis', rows, `fisioterapis_${date}.xlsx`);
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async (mode: 'all' | 'month', monthStr?: string) => {
    try {
      setIsExportingPDF(true);
      const res = await physiotherapistService.getPhysiotherapists(1, 1000, search);
      let records = res.data?.data || [];
      
      if (mode === 'month' && monthStr) {
        const [year, month] = monthStr.split('-');
        records = records.filter((r: any) => {
          if (!r.created_at) return false;
          const date = new Date(r.created_at);
          return date.getFullYear().toString() === year && 
                 String(date.getMonth() + 1).padStart(2, '0') === month;
        });
        
        if (records.length === 0) {
          toast.error('Tidak ada data fisioterapis pada bulan tersebut');
          return;
        }
      }
      
      const columns = ['Nama', 'Spesialisasi', 'Nomor Lisensi', 'Telepon', 'Status'];
      const rowData = records.map((r: any) => [
        r.name, 
        r.specialization || '-', 
        r.sip || '-', 
        r.phone || '-', 
        r.status === 'active' || r.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'
      ]);
      
      const titleSuffix = (() => {
        if (mode === 'month' && monthStr) {
          const [y, m] = monthStr.split('-');
          const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          return ` - BULAN ${monthNames[parseInt(m) - 1].toUpperCase()} ${y}`;
        }
        return '';
      })();
      exportToPDF(`Data Fisioterapis${titleSuffix}`, columns, rowData);
      setIsPdfDialogOpen(false);
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['physiotherapists', pageIndex, search],
    queryFn: () => physiotherapistService.getPhysiotherapists(pageIndex + 1, pageSize, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => physiotherapistService.deletePhysiotherapist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physiotherapists'] });
      toast.success('Fisioterapis berhasil dihapus');
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus data fisioterapis ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (physio: Physiotherapist) => {
    setEditingPhysiotherapist(physio);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPhysiotherapist(null);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<Physiotherapist>[] = [
    { accessorKey: 'name', header: 'Nama' },
    { accessorKey: 'specialization', header: 'Spesialis' },
    { accessorKey: 'sip', header: 'SIP' },
    { accessorKey: 'phone', header: 'Telepon' },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '-' },
    { 
      id: 'password', 
      header: 'Password',
      cell: () => <span className="text-slate-400">********</span>
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'} className={row.original.status === 'active' ? 'bg-green-100 text-green-700' : ''}>
          {row.original.status}
        </Badge>
      )
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

  const physiotherapists = data?.data?.data || [];
  
  const table = useReactTable({
    data: physiotherapists,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.data?.last_page || -1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Fisioterapis</h1>
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
            Excel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Fisioterapis
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Cari fisioterapis..." 
                className="pl-8" 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }}
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
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Memuat data fisioterapis...
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPhysiotherapist ? 'Ubah Fisioterapis' : 'Tambah Fisioterapis Baru'}</DialogTitle>
          </DialogHeader>
          <PhysiotherapistForm 
            initialData={editingPhysiotherapist} 
            onSuccess={() => setIsDialogOpen(false)}
            onCancel={() => setIsDialogOpen(false)}
          />
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
