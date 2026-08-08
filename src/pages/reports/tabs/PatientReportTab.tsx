import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../../../services/patientService';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { FileText, Download, Printer } from 'lucide-react';
import { exportToPDF, exportToExcel, printReport } from '../../../utils/exportUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export default function PatientReportTab() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // We fetch a large number of records for the report
  const { data, isLoading } = useQuery({
    queryKey: ['report-patients', searchTerm],
    queryFn: () => patientService.getPatients(1, 1000, searchTerm),
  });

  const records = data?.data?.data || [];

  const handleExportPDF = () => {
    const columns = ['ID', 'Nama', 'Tanggal Lahir', 'Jenis Kelamin', 'Telepon', 'Alamat'];
    const rowData = records.map((r: any) => [
      r.medical_record_number || '-', r.name, r.birth_date ? new Date(r.birth_date).toLocaleDateString() : '-', r.gender_data?.name || r.gender || '-', r.phone || '-', r.address || '-'
    ]);
    exportToPDF('Laporan Pasien', columns, rowData);
  };

  const handleExportExcel = () => {
    const rowData = records.map((r: any) => ({
      'ID': r.medical_record_number || '-',
      'Nama': r.name,
      'Tanggal Lahir': r.birth_date ? new Date(r.birth_date).toLocaleDateString() : '-',
      'Jenis Kelamin': r.gender_data?.name || r.gender || '-',
      'Telepon': r.phone || '-',
      'Alamat': r.address || '-'
    }));
    exportToExcel('Laporan_Pasien', rowData);
  };

  const handlePrint = () => {
    const columns = ['ID', 'Nama', 'Tanggal Lahir', 'Jenis Kelamin', 'Telepon', 'Alamat'];
    const rowData = records.map((r: any) => [
      r.medical_record_number || '-', r.name, r.birth_date ? new Date(r.birth_date).toLocaleDateString() : '-', r.gender_data?.name || r.gender || '-', r.phone || '-', r.address || '-'
    ]);
    printReport('Laporan Pasien', columns, rowData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Laporan Pasien</CardTitle>
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
            placeholder="Cari pasien..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="border rounded-md max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tanggal Lahir</TableHead>
                <TableHead>Jenis Kelamin</TableHead>
                <TableHead>Telepon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat...</TableCell></TableRow>
              ) : records.length > 0 ? (
                records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.medical_record_number || '-'}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.birth_date ? new Date(r.birth_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{r.gender_data?.name || r.gender || '-'}</TableCell>
                    <TableCell>{r.phone || '-'}</TableCell>
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
