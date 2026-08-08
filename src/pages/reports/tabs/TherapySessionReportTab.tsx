import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { therapySessionService } from '../../../services/therapySessionService';
import { patientService } from '../../../services/patientService';
import { physiotherapistService } from '../../../services/physiotherapistService';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { FileText, Download, Printer } from 'lucide-react';
import { exportToPDF, exportToExcel, printReport } from '../../../utils/exportUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export default function TherapySessionReportTab() {
  const [patientId, setPatientId] = useState<string>('all');
  const [physiotherapistId, setPhysiotherapistId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { data: patientsData } = useQuery({
    queryKey: ['report-patients-list'],
    queryFn: () => patientService.getPatients(1, 100),
  });

  const { data: physiosData } = useQuery({
    queryKey: ['report-physios-list'],
    queryFn: () => physiotherapistService.getPhysiotherapists(1, 100),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['report-therapy-sessions', patientId, physiotherapistId, startDate, endDate],
    queryFn: () => therapySessionService.getTherapySessions(
      1, 
      1000, 
      '',
      startDate || undefined,
      endDate || undefined,
      patientId !== 'all' ? patientId : undefined,
      physiotherapistId !== 'all' ? physiotherapistId : undefined
    ),
  });

  const records = data?.data?.data || [];
  const patients = patientsData?.data?.data || [];
  const physios = physiosData?.data?.data || [];

  const handleExportPDF = () => {
    const columns = ['Tanggal', 'Pasien', 'Fisioterapis', 'Status', 'Durasi (menit)'];
    const rowData = records.map((r: any) => [
      new Date(r.therapy_date).toLocaleDateString(), 
      r.patient?.name || '-', 
      r.physiotherapist?.name || '-', 
      r.status,
      r.duration || '-'
    ]);
    exportToPDF('Laporan Sesi Terapi', columns, rowData);
  };

  const handleExportExcel = () => {
    const rowData = records.map((r: any) => ({
      'Tanggal': new Date(r.therapy_date).toLocaleDateString(),
      'Pasien': r.patient?.name || '-',
      'Fisioterapis': r.physiotherapist?.name || '-',
      'Status': r.status,
      'Durasi (menit)': r.duration || '-'
    }));
    exportToExcel('Laporan_Sesi_Terapi', rowData);
  };

  const handlePrint = () => {
    const columns = ['Tanggal', 'Pasien', 'Fisioterapis', 'Status', 'Durasi (menit)'];
    const rowData = records.map((r: any) => [
      new Date(r.therapy_date).toLocaleDateString(), 
      r.patient?.name || '-', 
      r.physiotherapist?.name || '-', 
      r.status,
      r.duration || '-'
    ]);
    printReport('Laporan Sesi Terapi', columns, rowData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Laporan Sesi Terapi</CardTitle>
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
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Pasien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pasien</SelectItem>
              {patients.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={physiotherapistId} onValueChange={setPhysiotherapistId}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Fisioterapis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Fisioterapis</SelectItem>
              {physios.map((p: any) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input 
            type="date"
            placeholder="Tanggal Mulai" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input 
            type="date"
            placeholder="Tanggal Akhir" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="border rounded-md max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Fisioterapis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Durasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Memuat...</TableCell></TableRow>
              ) : records.length > 0 ? (
                records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.therapy_date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.patient?.name || '-'}</TableCell>
                    <TableCell>{r.physiotherapist?.name || '-'}</TableCell>
                    <TableCell className="capitalize">{r.status}</TableCell>
                    <TableCell>{r.duration ? `${r.duration} menit` : '-'}</TableCell>
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
