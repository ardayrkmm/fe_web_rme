import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { therapySessionService } from '../../services/therapySessionService';
import { appointmentService } from '../../services/appointmentService';
import { physiotherapistService } from '../../services/physiotherapistService';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppointmentForm } from '../appointments/AppointmentForm';
import { MedicalRecordForm } from '../medical-records/MedicalRecordForm';
import { TherapySessionForm } from './TherapySessionForm';
import { useAuthStore } from '../../store/useAuthStore';

export default function TherapySessions() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isPhysio = user?.role === 'fisioterapis';
  
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return getStartOfWeek(d).toISOString().split('T')[0];
  });
  
  const currentWeekEnd = (() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();

  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });

  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [isMedicalRecordFormOpen, setIsMedicalRecordFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<any>(null);
  const [prefillData, setPrefillData] = useState<any>(null);

  useEffect(() => {
    if (location.state?.createFromAppointment) {
      setPrefillData(location.state.createFromAppointment);
      setSelectedSessionForEdit(null);
      setIsSessionFormOpen(true);
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);



  const handlePreviousWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    const newStart = d.toISOString().split('T')[0];
    setCurrentWeekStart(newStart);
    setSelectedDateStr(newStart);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    const newStart = d.toISOString().split('T')[0];
    setCurrentWeekStart(newStart);
    setSelectedDateStr(newStart);
  };

  const { data: physiosData, isLoading: isLoadingPhysios } = useQuery({
    queryKey: ['physios-list'],
    queryFn: () => physiotherapistService.getPhysiotherapists(1, 100),
  });

  const { data: appointmentsData, isLoading, refetch } = useQuery({
    queryKey: ['therapy-schedule-weekly', currentWeekStart, currentWeekEnd],
    queryFn: () => appointmentService.getAppointments(1, 500),
    refetchInterval: 3000, // Near-realtime polling every 3 seconds
  });

  // Realtime sync for the open modal
  useEffect(() => {
    if (isDetailOpen && selectedSlot?.data?.appointment?.id && appointmentsData?.data?.data) {
      const appointments = appointmentsData.data.data;
      const updatedApt = appointments.find((a: any) => a.id === selectedSlot.data.appointment.id);
      
      if (updatedApt) {
        const currentStatus = updatedApt.therapy_session ? updatedApt.therapy_session.status : updatedApt.status;
        const currentDisplayStatus = currentStatus === 'telah_tiba' ? 'Telah Tiba' : 
                                     currentStatus === 'scheduled' ? 'Terjadwal' : 
                                     currentStatus === 'ongoing' ? 'Sedang Berlangsung' : 
                                     currentStatus === 'completed' ? 'Selesai' : 
                                     currentStatus;
        
        // Only update if the status or therapy_session actually changed to prevent infinite loops
        if (
          selectedSlot.data.status_code !== currentStatus || 
          JSON.stringify(selectedSlot.data.therapy_session) !== JSON.stringify(updatedApt.therapy_session)
        ) {
          setSelectedSlot((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              data: {
                ...prev.data,
                appointment: updatedApt,
                therapy_session: updatedApt.therapy_session,
                status_code: currentStatus,
                display_status: currentDisplayStatus
              }
            };
          });
        }
      }
    }
  }, [appointmentsData, isDetailOpen, selectedSlot]);

  const buildScheduleData = () => {
    let rawPhysios = Array.isArray(physiosData?.data?.data) ? physiosData.data.data : 
                     Array.isArray(physiosData?.data) ? physiosData.data : 
                     Array.isArray(physiosData) ? physiosData : [];
    
    let physios = [...rawPhysios];

    // Bagi fisioterapis, mereka hanya melihat tab "Semua Fisioterapis" (tanpa bisa filter individual)
    if (isPhysio) {
      physios = [{ id: 'all', name: 'Semua Fisioterapis' }];
    } else {
      physios = [{ id: 'all', name: 'Semua Fisioterapis' }, ...physios];
    }
    
    const appointments = Array.isArray(appointmentsData?.data?.data) ? appointmentsData.data.data :
                         Array.isArray(appointmentsData?.data) ? appointmentsData.data :
                         Array.isArray(appointmentsData) ? appointmentsData : [];

    return physios.map((physio: any) => {
      const physioSchedule = {
        physiotherapist: physio,
        schedule: {} as Record<string, any[]>
      };

      const d = new Date(currentWeekStart);
      const endD = new Date(currentWeekEnd);
      while (d <= endD) {
        const dateStr = d.toISOString().split('T')[0];
        physioSchedule.schedule[dateStr] = [];
        
        for (let i = 8; i <= 16; i++) {
          const timeStr = `${i.toString().padStart(2, '0')}:00`;
          
          const apts = appointments.filter((a: any) => {
            const aptDateStr = a.appointment_date ? new Date(a.appointment_date).toISOString().split('T')[0] : '';
            return (physio.id === 'all' || String(a.physiotherapist_id) === String(physio.id)) && 
                   aptDateStr === dateStr && 
                   a.appointment_time === timeStr &&
                   a.status !== 'cancelled';
          });

          if (apts.length > 0) {
            physioSchedule.schedule[dateStr].push({
              time: timeStr,
              range: `${timeStr} - ${String(i+1).padStart(2, '0')}:00`,
              is_empty: false,
              items: apts.map((apt: any) => {
                const p = rawPhysios.find((rp: any) => String(rp.id) === String(apt.physiotherapist_id));
                const currentStatus = apt.therapy_session ? apt.therapy_session.status : apt.status;
                return {
                  status_code: currentStatus,
                  display_status: currentStatus === 'telah_tiba' ? 'Telah Tiba' : 
                                  currentStatus === 'scheduled' ? 'Terjadwal' : 
                                  currentStatus === 'ongoing' ? 'In Progress' : 
                                  currentStatus === 'completed' ? 'Selesai' : 
                                  currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1).replace('_', ' '),
                  patient_name: apt.patient?.name || 'Unknown',
                  patient_rm: apt.patient?.medical_record_number || '-',
                  physiotherapist_name: p?.name || 'Unknown',
                  physiotherapist_email: p?.email,
                  physiotherapist_id: p?.id,
                  appointment: apt,
                  therapy_session: null
                };
              })
            });
          } else {
            physioSchedule.schedule[dateStr].push({
              time: timeStr,
              range: `${timeStr} - ${String(i+1).padStart(2, '0')}:00`,
              is_empty: true,
              items: []
            });
          }
        }
        d.setDate(d.getDate() + 1);
      }
      return physioSchedule;
    });
  };

  const scheduleData = buildScheduleData();

  const checkInMutation = useMutation({
    mutationFn: (appointmentId: number) => {
      return appointmentService.getAppointment(appointmentId).then(res => {
        const appointment = res.data;
        return appointmentService.updateAppointment(appointmentId, {
          patient_id: appointment.patient_id,
          physiotherapist_id: appointment.physiotherapist_id,
          service_master_id: appointment.service_master_id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time?.substring(0, 5),
          status: 'telah_tiba',
        });
      });
    },
    onSuccess: () => {
      toast.success('Pasien berhasil Check In (Telah Tiba)');
      refetch();
      if (selectedSlot) {
        setSelectedSlot({
          ...selectedSlot,
          data: {
            ...selectedSlot.data,
            appointment: {
              ...selectedSlot.data.appointment,
              status: 'telah_tiba'
            },
            display_status: 'Telah Tiba',
            status_code: 'telah_tiba'
          }
        });
      }
    },
    onError: () => toast.error('Gagal melakukan Check In'),
  });

  const startSessionMutation = useMutation({
    mutationFn: (sessionId: number) => {
      return therapySessionService.getTherapySession(sessionId).then(res => {
        const session = res.data;
        return therapySessionService.updateTherapySession(sessionId, {
          ...session,
          status: 'ongoing',
        });
      });
    },
    onSuccess: (data, variables) => {
      toast.success('Sesi Terapi dimulai');
      refetch();
      if (selectedSlot) {
        setSelectedSlot({
          ...selectedSlot,
          data: {
            ...selectedSlot.data,
            therapy_session: {
              ...selectedSlot.data.therapy_session,
              status: 'ongoing',
              id: variables
            },
            status: 'Sedang Berlangsung',
            status_code: 'ongoing'
          }
        });
      }
    },
    onError: () => toast.error('Gagal memulai sesi'),
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => {
      return therapySessionService.createTherapySession(data);
    },
    onSuccess: (res) => {
      toast.success('Sesi Terapi dimulai');
      refetch();
      if (selectedSlot) {
        setSelectedSlot({
          ...selectedSlot,
          data: {
            ...selectedSlot.data,
            therapy_session: {
              id: res?.data?.id || 0,
              status: 'ongoing',
            },
            status: 'Sedang Berlangsung',
            status_code: 'ongoing'
          }
        });
      }
    },
    onError: () => toast.error('Gagal memulai sesi'),
  });

  const completeSessionMutation = useMutation({
    mutationFn: (sessionId: number) => {
      return therapySessionService.getTherapySession(sessionId).then(res => {
        const session = res.data;
        return therapySessionService.updateTherapySession(sessionId, {
          ...session,
          status: 'completed',
        });
      });
    },
    onSuccess: () => {
      toast.success('Sesi Terapi dan Rekam Medis berhasil disimpan');
      refetch();
      if (selectedSlot) {
        setSelectedSlot({
          ...selectedSlot,
          data: {
            ...selectedSlot.data,
            therapy_session: {
              ...selectedSlot.data.therapy_session,
              status: 'completed',
            },
            status: 'Selesai',
            status_code: 'completed'
          }
        });
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || error?.message || 'Gagal menyelesaikan sesi'),
  });

  const handleSlotClick = (slot: any, physio: any, dateStr: string) => {
    if (slot.is_empty) {
      if (isPhysio) {
        toast.info('Hanya admin yang dapat membuat jadwal terapi.');
        return;
      }
      setSelectedSlot({ ...slot, physio, date: dateStr });
      setIsAppointmentFormOpen(true);
    } else {
      setSelectedSlot({ ...slot, date: dateStr });
      setIsDetailOpen(true);
    }
  };

  const handleCheckIn = () => {
    if (selectedSlot?.data?.appointment?.id) {
      checkInMutation.mutate(selectedSlot.data.appointment.id);
    }
  };

  const handleStartSession = () => {
    if (!selectedSlot) return;
    
    if (selectedSlot?.data?.therapy_session) {
      if (selectedSlot.data.therapy_session.status === 'scheduled') {
        startSessionMutation.mutate(selectedSlot.data.therapy_session.id);
      } else if (selectedSlot.data.therapy_session.status === 'ongoing') {
        setPrefillData({
          patient_id: selectedSlot.data.appointment.patient_id,
          physiotherapist_id: selectedSlot.data.appointment.physiotherapist_id,
          service_id: selectedSlot.data.appointment.service_master_id,
          appointment_id: selectedSlot.data.appointment.id,
          examination_date: selectedSlot.data.appointment.appointment_date,
          visit_number: selectedSlot.data.appointment.visit_number || '',
        });
        setIsMedicalRecordFormOpen(true);
      }
    } else if (selectedSlot.data && selectedSlot.data.appointment) {
      createSessionMutation.mutate({
        patient_id: selectedSlot.data.appointment.patient_id,
        physiotherapist_id: selectedSlot.data.appointment.physiotherapist_id,
        service_master_id: selectedSlot.data.appointment.service_master_id,
        appointment_id: selectedSlot.data.appointment.id,
        therapy_date: selectedSlot.data.appointment.appointment_date,
        complaint: selectedSlot.data.appointment.complaint || '-',
        treatment_given: '-',
        status: 'ongoing'
      });
    }
  };

  const getServiceName = (item: any) => {
    if (item?.therapy_session?.service_masters && item.therapy_session.service_masters.length > 0) {
      return item.therapy_session.service_masters.map((s: any) => s.name).join(' + ');
    }
    if (item?.therapy_session?.service_master?.name) {
      return item.therapy_session.service_master.name;
    }
    return item?.appointment?.service_master?.name || '-';
  };

  const getStatusColor = (statusCode: string) => {
    switch (statusCode) {
      case 'empty': return 'bg-white text-slate-400 border-transparent hover:border-slate-200';
      case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm';
      case 'arrived': 
      case 'telah_tiba': return 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm';
      case 'ongoing': return 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm';
      case 'completed': return 'bg-green-50 text-green-700 border-green-200 shadow-sm';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Slot Terapi</h1>
          <p className="text-slate-500">Kelola jadwal mingguan per fisioterapis</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-sm font-medium px-2">
            {new Date(currentWeekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' - '}
            {new Date(currentWeekEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="pb-4">
        {isLoading || isLoadingPhysios ? (
          <div className="w-full text-center py-12 text-slate-500">Memuat jadwal mingguan...</div>
        ) : scheduleData.length === 0 ? (
          <div className="w-full text-center py-12 text-slate-500">Tidak ada data fisioterapis.</div>
        ) : (
          <Tabs defaultValue={scheduleData[0]?.physiotherapist.id.toString()} className="w-full">
            {!isPhysio && (
              <div className="flex overflow-x-auto pb-2 mb-2 no-scrollbar">
                <TabsList className="min-w-max">
                  {scheduleData.map((physioSchedule: any) => (
                    <TabsTrigger key={physioSchedule.physiotherapist.id} value={physioSchedule.physiotherapist.id.toString()}>
                      <Stethoscope className="w-4 h-4 mr-2" />
                      {physioSchedule.physiotherapist.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            )}

            {scheduleData.map((physioSchedule: any) => {
              const dates = Object.keys(physioSchedule.schedule);
              const activeDateStr = dates.includes(selectedDateStr) ? selectedDateStr : dates[0];
              
              return (
                <TabsContent key={physioSchedule.physiotherapist.id} value={physioSchedule.physiotherapist.id.toString()} className="mt-0 outline-none">
                  
                  <div className="flex overflow-x-auto pb-4 mb-2 no-scrollbar gap-2">
                    {dates.map(dateStr => {
                      const d = new Date(dateStr);
                      const isSelected = dateStr === activeDateStr;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDateStr(dateStr)}
                          className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-3 rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-xs ${isSelected ? 'font-medium' : ''}`}>
                            {d.toLocaleDateString('id-ID', { weekday: 'short' })}
                          </span>
                          <span className={`text-lg font-bold mt-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {d.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="space-y-3">
                      {Array.from({ length: 9 }).map((_, rowIndex) => {
                        const slot = physioSchedule.schedule[activeDateStr]?.[rowIndex];
                        if (!slot) return null;
                        
                        if (slot.is_empty) {
                          return (
                            <div 
                              key={rowIndex} 
                              onClick={() => handleSlotClick(slot, physioSchedule.physiotherapist, activeDateStr)}
                              className="flex items-center p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                              <div className="w-[120px] font-semibold text-slate-500 text-sm">
                                {slot.range}
                              </div>
                              <div className="flex-1 text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
                                KOSONG
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={rowIndex} className="space-y-2">
                            {slot.items.map((item: any, itemIndex: number) => {
                              const isCompleted = item.status_code === 'completed';
                              const bgColorClass = isCompleted ? 'bg-green-50' : 'bg-blue-50';
                              const borderColorClass = isCompleted ? 'border-green-100' : 'border-blue-100';
                              const textColorClass = isCompleted ? 'text-green-700' : 'text-blue-700';

                              return (
                                <div 
                                  key={itemIndex}
                                  onClick={() => handleSlotClick({...slot, data: item}, physioSchedule.physiotherapist, activeDateStr)}
                                  className={`flex items-start sm:items-center p-4 rounded-xl border ${bgColorClass} ${borderColorClass} cursor-pointer hover:shadow-md transition-all relative overflow-hidden`}
                                >
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                  
                                  <div className={`w-[120px] font-bold ${textColorClass} text-sm`}>
                                    {slot.range}
                                  </div>
                                  
                                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <div className={`font-bold text-base ${isCompleted ? 'text-green-900' : 'text-slate-800'}`}>
                                        {item.patient_name}
                                      </div>
                                      <div className={`text-sm mt-0.5 flex items-center gap-1.5 ${isCompleted ? 'text-green-800' : 'text-slate-600'}`}>
                                        <Stethoscope className="w-3.5 h-3.5 opacity-70" />
                                        <span>{getServiceName(item)}</span>
                                        {physioSchedule.physiotherapist.id === 'all' && (
                                          <>
                                            <span className="opacity-50 mx-1">•</span>
                                            <span>Fisio: {item.physiotherapist_name}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className={`${isCompleted ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'} whitespace-nowrap`}
                                    >
                                      {item.display_status}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Isi Slot Terapi</DialogTitle>
          </DialogHeader>
          {isAppointmentFormOpen && (
            <AppointmentForm 
              initialData={{
                appointment_date: selectedSlot?.date,
                appointment_time: selectedSlot?.time,
                physiotherapist_id: selectedSlot?.physio?.id === 'all' ? '' : selectedSlot?.physio?.id
              }} 
              onSuccess={() => {
                setIsAppointmentFormOpen(false);
                refetch();
              }}
              onCancel={() => setIsAppointmentFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detail Slot Terapi</DialogTitle>
          </DialogHeader>
          {selectedSlot?.data && (
            <div className="space-y-6 text-sm mt-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 bg-slate-50 p-4 rounded-lg border">
                <div>
                  <span className="text-slate-500 block mb-1">Status</span>
                  <Badge className={getStatusColor(selectedSlot.data.status_code)}>{selectedSlot.data.display_status}</Badge>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Waktu</span>
                  <div className="font-medium text-lg">{new Date(selectedSlot.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {selectedSlot.range}</div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Pasien</span>
                  <div className="font-semibold text-base">{selectedSlot.data.patient_name} <span className="text-sm font-normal text-slate-500">({selectedSlot.data.patient_rm})</span></div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Fisioterapis</span>
                  <div className="font-semibold text-base">{selectedSlot.data.physiotherapist_name}</div>
                </div>
                <div className="col-span-2 border-t pt-3 mt-1">
                  <span className="text-slate-500 block mb-1">Layanan / Treatment</span>
                  <div className="font-medium text-blue-700">{getServiceName(selectedSlot.data)}</div>
                </div>
                <div className="col-span-2 border-t pt-3 mt-1">
                  <span className="text-slate-500 block mb-1">Keluhan Awal</span>
                  <div className="text-slate-700 bg-white p-2 rounded border">{selectedSlot.data.appointment?.complaint || '-'}</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Tutup
                </Button>
                
                {(!isPhysio || user?.email?.toLowerCase() === selectedSlot?.data?.physiotherapist_email?.toLowerCase() || user?.name?.toLowerCase() === selectedSlot?.data?.physiotherapist_name?.toLowerCase()) && (
                  <>
                    {['pending', 'approved', 'scheduled'].includes(selectedSlot.data.appointment?.status) && (
                      <Button 
                        onClick={handleCheckIn} 
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        disabled={checkInMutation.isPending}
                      >
                        {checkInMutation.isPending ? 'Memproses...' : 'Pasien Datang'}
                      </Button>
                    )}

                    {selectedSlot.data.status_code !== 'completed' && selectedSlot.data.appointment?.status === 'telah_tiba' && (
                      <Button onClick={handleStartSession} className="bg-orange-500 hover:bg-orange-600">
                        {selectedSlot.data.therapy_session?.status === 'ongoing' ? 'Selesaikan Sesi' : 'Mulai Sesi'}
                      </Button>
                    )}
                  </>
                )}
                
                {!isPhysio && selectedSlot.data.status_code === 'completed' && (
                  <Button onClick={() => navigate('/payments', {
                    state: {
                      createFromSession: selectedSlot.data
                    }
                  })} className="bg-green-600 hover:bg-green-700">
                    Lanjut ke Pembayaran
                  </Button>
                )}

                {/* Riwayat RM: Fisioterapis bisa melihat riwayat RME pasien yang ditanganinya */}
                {isPhysio && selectedSlot?.data?.patient_id && (
                  <Button
                    variant="outline"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={() => {
                      setIsDetailOpen(false);
                      navigate('/medical-records', {
                        state: {
                          viewHistoryPatientId: selectedSlot.data.patient_id,
                          viewHistoryPatientName: selectedSlot.data.patient_name || selectedSlot.data.appointment?.patient?.name,
                        }
                      });
                    }}
                  >
                    Riwayat RM Pasien
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSessionFormOpen} onOpenChange={setIsSessionFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Sesi Terapi (SOAP Notes)</DialogTitle>
          </DialogHeader>
          {isSessionFormOpen && (selectedSessionForEdit || prefillData) && (
            <TherapySessionForm 
              initialData={selectedSessionForEdit} 
              prefillData={prefillData}
              onSuccess={() => {
                setIsSessionFormOpen(false);
                refetch();
              }}
              onCancel={() => setIsSessionFormOpen(false)}
            />
          )}
          {isSessionFormOpen && !selectedSessionForEdit && !prefillData && (
            <div className="text-center py-8 text-slate-500">
              Sesi Terapi belum otomatis terbuat. Silakan pastikan Pasien sudah ditandai "Telah Tiba" di menu Janji Terapi, atau hubungi admin.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isMedicalRecordFormOpen} onOpenChange={setIsMedicalRecordFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catatan Klinis (Rekam Medis)</DialogTitle>
          </DialogHeader>
          {isMedicalRecordFormOpen && prefillData && (
            <MedicalRecordForm 
              prefillData={prefillData}
              onSuccess={() => {
                setIsMedicalRecordFormOpen(false);
                completeSessionMutation.mutate(selectedSlot.data.therapy_session.id);
              }}
              onCancel={() => setIsMedicalRecordFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
