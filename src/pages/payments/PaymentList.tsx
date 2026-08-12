import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../../services/paymentService';
import { generateInvoicePdf } from '../../utils/invoicePdf';

import type { Payment } from '../../services/paymentService';
import { exportToPDF } from '../../utils/exportUtils';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
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
import { Plus, Search, FileDown, Eye, FileText, Download, Share2, MessageCircle, MoreHorizontal, ChevronLeft, ChevronRight, FileSpreadsheet, Download as DownloadIcon, Pencil, CheckCircle, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status?.toLowerCase() || '';
  const map: Record<string, string> = {
    lunas: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    dibatalkan: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[normalizedStatus] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

function RowActions({ row }: { row: Payment }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleDownload = async () => {
    try {
      const res = await paymentService.getPayment(row.id as string);
      const fullRow = res.data;
      const doc = await generateInvoicePdf(fullRow);
      doc.save(`Invoice_${fullRow.invoice_number}.pdf`);
    } catch {
      toast.error('Gagal membuat PDF invoice');
    }
  };

  const handlePreview = async () => {
    try {
      const res = await paymentService.getPayment(row.id as string);
      const fullRow = res.data;
      const doc = await generateInvoicePdf(fullRow);
      const blob = doc.output('blob');
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat preview PDF');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/payments/${row.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link tersalin!');
  };

  const handleWhatsApp = () => {
    const text =
      `Halo Bapak/Ibu ${row.patient_name}\n\n` +
      `Terima kasih telah melakukan terapi di Arummy Fisioterapi.\n\n` +
      `Invoice: ${row.invoice_number}\n` +
      `Total: Rp ${Number(row.total).toLocaleString('id-ID')}\n` +
      `Status: ${row.status}\n\n` +
      `Semoga lekas pulih.\n\nSalam,\nArummy Fisioterapi`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = () => {
    const subject = `Invoice Pembayaran Terapi - ${row.invoice_number}`;
    const body =
      `Halo Bapak/Ibu ${row.patient_name}\n\n` +
      `Berikut informasi invoice terapi Anda:\n` +
      `No. Invoice: ${row.invoice_number}\n` +
      `Total: Rp ${Number(row.total).toLocaleString('id-ID')}\n` +
      `Status: ${row.status}\n\n` +
      `Semoga lekas pulih.\n\nSalam,\nArummy Fisioterapi`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => 
      paymentService.updatePayment(row.id, { 
        ...row, 
        patient_id: row.patient_id,
        physiotherapist_id: row.physiotherapist_id,
        therapy_session_id: row.therapy_session_id,
        status: newStatus 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Status pembayaran berhasil diperbarui!');
    },
    onError: () => toast.error('Gagal memperbarui status pembayaran'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => paymentService.deletePayment(row.id),
    onSuccess: () => {
      toast.success('Pembayaran berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: () => toast.error('Gagal menghapus pembayaran'),
  });

  const handleDelete = () => {
    if (window.confirm('Yakin ingin menghapus data pembayaran ini?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Quick actions */}
      {row.status?.toLowerCase() === 'pending' && (
        <Button
          variant="ghost"
          size="icon"
          title="Tandai Lunas"
          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
          onClick={() => updateStatusMutation.mutate('Lunas')}
          disabled={updateStatusMutation.isPending}
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        title="Edit Data"
        className="h-8 w-8 text-blue-600"
        onClick={() => navigate(`/payments/${row.id}/edit`)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Detail"
        className="h-8 w-8 text-slate-600"
        onClick={() => navigate(`/payments/${row.id}`)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Hapus"
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Pratinjau PDF"
        className="h-8 w-8"
        onClick={handlePreview}
      >
        <FileText className="h-4 w-4" />
      </Button>

      {/* Share dialog trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Bagikan" className="h-8 w-8 text-blue-600">
            <Share2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bagikan Invoice {row.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="h-14 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={handleEmail} className="h-14">
              <FileText className="w-5 h-5 mr-2" />
              Email
            </Button>
            <Button variant="outline" onClick={handleCopyLink} className="h-14">
              <Share2 className="w-5 h-5 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={handleDownload} className="h-14">
              <Download className="w-5 h-5 mr-2" />
              Unduh
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function PaymentList() {
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 15;

  // Helper: get all payments for export (fetch large page)
  const fetchAllForExport = async () => {
    const res = await paymentService.getPayments(1, 1000, search, statusFilter, startDate, endDate);
    return res?.data?.data || [];
  };

  const { data, isLoading } = useQuery({
    queryKey: ['payments', pageIndex, search, statusFilter, startDate, endDate],
    queryFn: () =>
      paymentService.getPayments(pageIndex + 1, pageSize, search, statusFilter, startDate, endDate),
  });

  const payments: Payment[] = data?.data?.data ?? [];
  const lastPage: number = data?.data?.last_page ?? 1;
  const total: number = data?.data?.data?.total ?? 0;
  const from: number = data?.data?.from ?? 0;
  const to: number = data?.data?.to ?? 0;

  // Compute quick stats from current page data (approx.)
  const totalAmount = payments.reduce((s, p) => s + Number(p.total), 0);




  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const records = await fetchAllForExport();
      if (records.length === 0) {
        toast.error('Tidak ada data untuk diekspor');
        return;
      }
      const pdfColumns = ['No. Invoice', 'Tanggal', 'Pasien', 'Fisioterapis', 'Total', 'Metode', 'Status'];
      const rowData = records.map((r: any) => [
        r.invoice_number || '-',
        r.payment_date ? new Date(r.payment_date).toLocaleDateString('id-ID') : '-',
        r.patient_name || '-',
        r.physiotherapist_name || '-',
        `Rp ${Number(r.total).toLocaleString('id-ID')}`,
        r.payment_method || '-',
        r.status || '-',
      ]);
      exportToPDF('Laporan Data Pembayaran', pdfColumns, rowData);
      toast.success('PDF berhasil diunduh');
    } catch (error) {
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'invoice_number',
      header: 'No. Invoice',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-blue-700">{row.original.invoice_number}</span>
      ),
    },
    {
      accessorKey: 'payment_date',
      header: 'Tanggal',
      cell: ({ row }) =>
        new Date(row.original.payment_date).toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
    },
    { accessorKey: 'patient_name', header: 'Pasien' },
    { accessorKey: 'physiotherapist_name', header: 'Fisioterapis' },
    {
      id: 'layanan',
      header: 'Layanan',
      cell: ({ row }) => {
        const details = (row.original as any).details || (row.original as any).payment_details || [];
        if (details.length === 0) return <span className="text-slate-400 text-xs">-</span>;
        
        const getServiceText = (d: any) => (d.item_name || d.service_name || d.name || 'LAYANAN TERAPI').toUpperCase();
        
        if (details.length === 1) return <span className="text-xs font-medium text-slate-700">{getServiceText(details[0])}</span>;
        return (
          <span className="text-xs font-medium text-slate-700">
            {getServiceText(details[0])}{' '}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 ml-1">
              +{details.length - 1}
            </span>
          </span>
        );
      },
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-semibold text-slate-900">
          Rp {Number(row.original.total).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      accessorKey: 'payment_method',
      header: 'Metode',
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
          {row.original.payment_method}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <RowActions row={row.original} />,
    },
  ];

  const table = useReactTable({
    data: payments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: lastPage,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola transaksi dan invoice pasien</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari invoice, pasien, fisioterapis..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }}
              />
            </div>
            {/* Date range */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">Dari</label>
                <Input
                  type="date"
                  className="w-36 h-9 text-sm"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPageIndex(0); }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">Sampai</label>
                <Input
                  type="date"
                  className="w-36 h-9 text-sm"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPageIndex(0); }}
                />
              </div>
            </div>
            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageIndex(0); }}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Menunggu">Menunggu</SelectItem>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                  <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Export dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium invisible">Export</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2" disabled={isExporting}>
                    <FileDown className="w-4 h-4" />
                    {isExporting ? 'Mengekspor...' : 'Export'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">

                  <DropdownMenuItem onClick={handleExportPdf}>
                    <FileDown className="mr-2 h-4 w-4 text-red-600" />
                    Ekspor PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="bg-slate-50 hover:bg-slate-50">
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-default"
                  >
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
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="font-medium text-slate-600">Belum ada data pembayaran</p>
                      <p className="text-sm">Coba ubah filter atau buat pembayaran baru</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/50">
          <p className="text-sm text-slate-500">
            {total > 0 ? `Menampilkan ${from}–${to} dari ${total} transaksi` : 'Tidak ada data'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Hal {pageIndex + 1} / {lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPageIndex((p) => Math.min(lastPage - 1, p + 1))}
              disabled={pageIndex >= lastPage - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
