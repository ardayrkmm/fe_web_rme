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
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { therapySessionService } from '../../services/therapySessionService';
import { patientService } from '../../services/patientService';
import { physiotherapistService } from '../../services/physiotherapistService';
import { serviceMasterService } from '../../services/serviceMasterService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';

const therapySessionSchema = z.object({
  patient_id: z.string().min(1, 'Pasien wajib dipilih'),
  physiotherapist_id: z.string().min(1, 'Fisioterapis wajib dipilih'),
  therapy_date: z.string().min(1, 'Tanggal terapi wajib diisi'),
  complaint: z.string().min(1, 'Keluhan wajib diisi'),
  objective: z.string().optional().or(z.literal('')),
  assessment: z.string().optional().or(z.literal('')),
  plan: z.string().optional().or(z.literal('')),
  treatment_given: z.string().min(1, 'Tindakan wajib diisi'),
  duration: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']),
  service_master_id: z.string().min(1, 'Layanan wajib dipilih'),
  service_master_id_2: z.string().optional().or(z.literal('none')),
});

type TherapySessionFormValues = z.infer<typeof therapySessionSchema>;

interface TherapySessionFormProps {
  initialData?: any;
  prefillData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TherapySessionForm({ initialData, prefillData, onSuccess, onCancel }: TherapySessionFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const dataToUse = initialData || prefillData;

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

  const form = useForm<TherapySessionFormValues>({
    resolver: zodResolver(therapySessionSchema),
    defaultValues: {
      patient_id: dataToUse?.patient_id ? String(dataToUse.patient_id) : '',
      physiotherapist_id: dataToUse?.physiotherapist_id ? String(dataToUse.physiotherapist_id) : '',
      therapy_date: dataToUse?.therapy_date ? dataToUse.therapy_date.split('T')[0] : '',
      complaint: dataToUse?.complaint || '',
      objective: dataToUse?.objective || '',
      assessment: dataToUse?.assessment || '',
      plan: dataToUse?.plan || '',
      treatment_given: dataToUse?.treatment_given || '',
      duration: dataToUse?.duration ? String(dataToUse.duration) : '',
      notes: dataToUse?.notes || '',
      status: dataToUse?.status || 'scheduled',
      service_master_id: dataToUse?.service_master_ids?.[0] || (dataToUse?.service_master_id ? String(dataToUse.service_master_id) : ''),
      service_master_id_2: dataToUse?.service_master_ids?.[1] || 'none',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: TherapySessionFormValues) => {
      const serviceIds = [data.service_master_id];
      if (data.service_master_id_2 && data.service_master_id_2 !== 'none') {
          serviceIds.push(data.service_master_id_2);
      }
      const payload = {
        ...data,
        service_master_ids: serviceIds,
        patient_id: data.patient_id,
        physiotherapist_id: data.physiotherapist_id,
        duration: data.duration ? Number(data.duration) : null,
        appointment_id: prefillData?.appointment_id || undefined,
      };
      return isEditing 
        ? therapySessionService.updateTherapySession(initialData.id, payload)
        : therapySessionService.createTherapySession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapy-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(isEditing ? 'Sesi terapi berhasil diperbarui' : 'Sesi terapi berhasil ditambahkan');
      onSuccess();
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const onSubmit = (data: TherapySessionFormValues) => {
    const formattedData = {
      ...data,
      therapy_date: data.therapy_date ? new Date(data.therapy_date).toISOString() : undefined,
    };
    mutation.mutate(formattedData as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patient_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pasien *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!initialData?.patient_id}>
                  <FormControl>
                    <SelectTrigger className={initialData?.patient_id ? "bg-slate-100 text-slate-600" : ""}>
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
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="service_master_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Layanan Terapi Utama *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Layanan Terapi" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} - Rp {s.price?.toLocaleString('id-ID')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="service_master_id_2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Layanan Terapi Tambahan (Opsional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Layanan Tambahan (Opsional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada tambahan</SelectItem>
                    {services.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} - Rp {s.price?.toLocaleString('id-ID')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="therapy_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Terapi *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} readOnly={!!initialData?.therapy_date} className={initialData?.therapy_date ? "bg-slate-100 text-slate-600" : ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durasi (menit)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="45" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Dijadwalkan</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
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
              <FormLabel>Keluhan *</FormLabel>
              <FormControl>
                <Textarea placeholder="Keluhan awal pasien..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objektif (O)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Temuan objektif..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assessment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asesmen (A)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Asesmen klinis..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="plan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rencana (P)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Rencana terapi..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="treatment_given"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tindakan yang Diberikan *</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tindakan terapi yang dilakukan..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan Perkembangan</FormLabel>
              <FormControl>
                <Textarea placeholder="Catatan tambahan atau perkembangan..." {...field} />
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
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Sesi'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
