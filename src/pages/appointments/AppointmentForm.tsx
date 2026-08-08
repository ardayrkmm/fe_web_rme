import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../../services/appointmentService';
import { patientService } from '../../services/patientService';
import { physiotherapistService } from '../../services/physiotherapistService';
import { serviceMasterService } from '../../services/serviceMasterService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Pasien wajib dipilih'),
  physiotherapist_id: z.string().min(1, 'Fisioterapis wajib dipilih'),
  service_master_id: z.string().min(1, 'Layanan terapi wajib dipilih'),
  appointment_date: z.string().min(1, 'Tanggal wajib diisi'),
  appointment_time: z.string().min(1, 'Waktu wajib diisi'),
  complaint: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AppointmentForm({ initialData, onSuccess, onCancel }: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData?.id;

  const { data: patientsData } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientService.getPatients(1, 100),
  });
  
  const { data: physiosData } = useQuery({
    queryKey: ['physios-list'],
    queryFn: () => physiotherapistService.getPhysiotherapists(1, 100),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => serviceMasterService.getServices(1, 100),
  });

  const patients = patientsData?.data?.data || [];
  const physios = physiosData?.data?.data || [];
  const services = servicesData?.data?.data || [];

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: initialData?.patient_id ? String(initialData.patient_id) : '',
      physiotherapist_id: initialData?.physiotherapist_id ? String(initialData.physiotherapist_id) : '',
      service_master_id: initialData?.service_master_id ? String(initialData.service_master_id) : '',
      appointment_date: initialData?.appointment_date || '',
      appointment_time: initialData?.appointment_time || '',
      complaint: initialData?.complaint || '',
      notes: initialData?.notes || '',
    },
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments-list', form.watch('appointment_date'), form.watch('physiotherapist_id')],
    queryFn: () => appointmentService.getAppointments(1, 100, '', '', form.watch('appointment_date'), form.watch('appointment_date'), '', form.watch('physiotherapist_id')),
    enabled: !!form.watch('appointment_date') && !!form.watch('physiotherapist_id'),
  });

  const bookedAppointments = appointmentsData?.data?.data || [];
  const bookedTimes = bookedAppointments
    .filter((app: any) => {
      if (app.id === initialData?.id) return false;
      if (app.status === 'cancelled') return false;
      
      const appDateStr = app.appointment_date ? new Date(app.appointment_date).toISOString().split('T')[0] : '';
      const selectedDateStr = form.watch('appointment_date');
      
      return appDateStr === selectedDateStr && String(app.physiotherapist_id) === String(form.watch('physiotherapist_id'));
    })
    .map((app: any) => app.appointment_time);

  const mutation = useMutation({
    mutationFn: (data: AppointmentFormValues) => {
      const payload = {
        ...data,
      };
      return isEditing 
        ? appointmentService.updateAppointment(initialData.id, payload)
        : appointmentService.createAppointment(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['therapy-sessions'] });
      toast.success(isEditing ? 'Jadwal temu berhasil diperbarui' : 'Jadwal temu berhasil ditambahkan');
      onSuccess();
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const onSubmit = (data: AppointmentFormValues) => {
    const formattedData = {
      ...data,
      appointment_date: data.appointment_date ? new Date(data.appointment_date).toISOString() : undefined,
    };
    mutation.mutate(formattedData as any);
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let i = 8; i <= 17; i++) {
      const timeString = `${i.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    return slots;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="patient_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pasien *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pasien" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="physiotherapist_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fisioterapis *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData?.physiotherapist_id}>
                <FormControl>
                  <SelectTrigger className={initialData?.physiotherapist_id ? "bg-slate-100 text-slate-600" : ""}>
                    <SelectValue placeholder="Pilih fisioterapis" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {physios.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_master_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Layanan Terapi *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Layanan Terapi" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} - Rp {s.price.toLocaleString('id-ID')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="appointment_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal *</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    readOnly={!!initialData?.appointment_date}
                    className={initialData?.appointment_date ? "bg-slate-100 text-slate-600 focus-visible:ring-0" : ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="appointment_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Waktu *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('appointment_date') || !form.watch('physiotherapist_id') || !!initialData?.appointment_time}>
                  <FormControl>
                    <SelectTrigger className={initialData?.appointment_time ? "bg-slate-100 text-slate-600 focus-visible:ring-0" : ""}>
                      <SelectValue placeholder="Pilih waktu" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {generateTimeSlots().map((time) => {
                      const isBooked = bookedTimes.includes(time);
                      return (
                        <SelectItem key={time} value={time} disabled={isBooked}>
                          {time} {isBooked ? '(Sudah dibooking)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="complaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keluhan</FormLabel>
              <FormControl>
                <Input placeholder="Keluhan pasien..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        


        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Janji Terapi'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
