import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { physiotherapistService } from '../../../services/physiotherapistService';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { FileText, Download, Printer } from 'lucide-react';
import { exportToPDF, exportToExcel, printReport } from '../../../utils/exportUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export default function PhysiotherapistReportTab() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['report-physiotherapists', searchTerm],
    queryFn: () => physiotherapistService.getPhysiotherapists(1, 1000, searchTerm),
  });

  const records = data?.data?.data || [];

  const handleExportPDF = () => {
    const columns = ['Nama', 'Spesialisasi', 'Nomor Lisensi', 'Telepon', 'Status'];
    const rowData = records.map((r: any) => [
      r.name, r.specialization, r.sip, r.phone, r.status === 'active' || r.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'
    ]);
    exportToPDF('Laporan Fisioterapis', columns, rowData);
  };

  const handleExportExcel = () => {
    const rowData = records.map((r: any) => ({
      'Nama': r.name,
      'Spesialisasi': r.specialization,
      'Nomor Lisensi': r.sip,
      'Telepon': r.phone,
      'Status': r.status === 'active' || r.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'
    }));
    exportToExcel('Laporan_Fisioterapis', rowData);
  };

  const handlePrint = () => {
    const columns = ['Nama', 'Spesialisasi', 'Nomor Lisensi', 'Telepon', 'Status'];
    const rowData = records.map((r: any) => [
      r.name, r.specialization, r.sip, r.phone, r.status === 'active' || r.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif'
    ]);
    printReport('Laporan Fisioterapis', columns, rowData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Laporan Fisioterapis</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || records.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Cetak
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading || records.length === 0}>
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isLoading || records.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <Input 
            placeholder="Cari fisioterapis..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="border rounded-md max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Spesialisasi</TableHead>
                <TableHead>Nomor Lisensi</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat...</TableCell></TableRow>
              ) : records.length > 0 ? (
                records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.specialization || '-'}</TableCell>
                    <TableCell>{r.sip || '-'}</TableCell>
                    <TableCell>{r.phone || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${(r.status === 'active' || r.status === 'Aktif') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {(r.status === 'active' || r.status === 'Aktif') ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center">Data tidak ditemukan</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
