import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceMasterService, type ServiceMaster } from '../../services/serviceMasterService';
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
import { Plus, Pencil, Trash2, Search, Layers, Download } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { ServiceMasterForm } from './ServiceMasterForm';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/errorHandler';
import { Badge } from '../../components/ui/badge';

import { downloadBlob, exportToExcelStyled } from '../../utils/exportUtils';

export default function ServiceMasterList() {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceMaster | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 10;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await serviceMasterService.getServices(1, 1000, search);
      const records = res.data?.data || [];
      if (records.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }
      
      const rows = records.map((r: any, index: number) => ({
        'No': index + 1,
        'Kode Layanan': r.service_code || '-',
        'Kategori': r.category?.name || '-',
        'Nama Layanan': r.name,
        'Deskripsi': r.description || '-',
        'Harga': r.price ? `Rp ${Number(r.price).toLocaleString('id-ID')}` : 'Rp 0',
        'Durasi (Menit)': r.duration_minutes || '-',
        'Status': r.is_active ? 'Aktif' : 'Tidak Aktif'
      }));
      
      const date = new Date().toISOString().split('T')[0];
      await exportToExcelStyled('Arummy Fisioterapi', 'Data Layanan', rows, `layanan_${date}.xlsx`);
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      handleApiError(error);
      toast.error('Gagal mengekspor file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['services', pageIndex, search],
    queryFn: () => serviceMasterService.getServices(pageIndex + 1, pageSize, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => serviceMasterService.deleteServiceMaster(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Layanan berhasil dihapus');
    },
    onError: (error: any) => {
      handleApiError(error);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus layanan ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (service: ServiceMaster) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const columns: ColumnDef<ServiceMaster>[] = [
    { accessorKey: 'code', header: 'Kode', cell: ({ row }) => row.original.code || '-' },
    { accessorKey: 'name', header: 'Nama Layanan' },
    { accessorKey: 'category', header: 'Kategori', cell: ({ row }) => row.original.category || '-' },
    { accessorKey: 'duration', header: 'Durasi (menit)', cell: ({ row }) => row.original.duration ? `${row.original.duration} menit` : '-' },
    { 
      accessorKey: 'price', 
      header: 'Harga',
      cell: ({ row }) => {
        return `Rp ${Number(row.original.price).toLocaleString('id-ID')}`;
      }
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'} className={row.original.is_active ? 'bg-green-100 text-green-800' : ''}>
          {row.original.is_active ? 'Aktif' : 'Tidak Aktif'}
        </Badge>
      ),
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

  const services = Array.isArray(data?.data?.data) ? data.data.data : [];
  
  const table = useReactTable({
    data: services,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: -1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Layanan Fisioterapi</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Layanan
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Cari layanan..." 
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
                        <Layers className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-medium text-slate-900">Layanan tidak ditemukan</p>
                      <p className="text-sm">Mulai dengan menambahkan layanan baru.</p>
                      <Button onClick={handleAdd} variant="outline" className="mt-2 text-primary border-primary/20 hover:bg-primary/5">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Layanan
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
              disabled={services.length < pageSize}
            >
              Selanjutnya
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Ubah Layanan' : 'Tambah Layanan Baru'}</DialogTitle>
          </DialogHeader>
          <ServiceMasterForm 
            initialData={editingService} 
            onSuccess={() => setIsDialogOpen(false)}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
