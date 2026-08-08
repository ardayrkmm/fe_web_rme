import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DashboardReportTab from './tabs/DashboardReportTab';
import PatientReportTab from './tabs/PatientReportTab';
import PhysiotherapistReportTab from './tabs/PhysiotherapistReportTab';
import AppointmentReportTab from './tabs/AppointmentReportTab';


export default function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Laporan & Analitik</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6 flex flex-wrap h-auto">
          <TabsTrigger value="dashboard">Beranda</TabsTrigger>
          <TabsTrigger value="patients">Data Pasien</TabsTrigger>
          <TabsTrigger value="physiotherapists">Fisioterapis</TabsTrigger>
          <TabsTrigger value="appointments">Data Janji Terapi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <DashboardReportTab />
        </TabsContent>
        <TabsContent value="patients">
          <PatientReportTab />
        </TabsContent>
        <TabsContent value="physiotherapists">
          <PhysiotherapistReportTab />
        </TabsContent>
        <TabsContent value="appointments">
          <AppointmentReportTab />
        </TabsContent>

      </Tabs>
    </div>
  );
}
