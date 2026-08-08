import { useState, useEffect } from 'react';
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
import { medicalRecordService } from '../../services/medicalRecordService';
import { patientService } from '../../services/patientService';
import { physiotherapistService } from '../../services/physiotherapistService';
import { serviceMasterService } from '../../services/serviceMasterService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';

import { useAuthStore } from '../../store/useAuthStore';

const medicalRecordSchema = z.object({
  visit_number: z.string().optional().or(z.literal('')),
  patient_id: z.string().min(1, 'Pasien wajib dipilih'),
  physiotherapist_id: z.string().min(1, 'Fisioterapis wajib dipilih'),
  service_id: z.string().optional().or(z.literal('')),
  examination_date: z.string().min(1, 'Tanggal pemeriksaan wajib diisi'),
  anamnesis: z.string().min(1, 'Hasil anamnesis wajib diisi'),
  diagnosis: z.string().min(1, 'Diagnosa wajib diisi'),
  therapy: z.string().min(1, 'Terapi wajib diisi'),
});

type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>;

interface MedicalRecordFormProps {
  initialData?: any;
  prefillData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MedicalRecordForm({ initialData, prefillData, onSuccess, onCancel }: MedicalRecordFormProps) {
  const { user } = useAuthStore();
  const isPhysio = user?.role?.toLowerCase() === 'fisioterapis';
  
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const dataToUse = initialData || prefillData;
  const [searchTerm, setSearchTerm] = useState('');

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

  // Jika user adalah fisioterapis, otomatis set physiotherapist_id ke diri sendiri
  const currentPhysio = isPhysio ? physios.find((p: any) => p.email?.toLowerCase() === user?.email?.toLowerCase()) : null;

  useEffect(() => {
    if (isPhysio && currentPhysio && !prefillData) {
      form.setValue('physiotherapist_id', String(currentPhysio.id));
    }
  }, [isPhysio, currentPhysio, prefillData]);

  const filteredPatients = patients.filter((p: any) => {
    const term = searchTerm.toLowerCase();
    const name = p.name?.toLowerCase() || '';
    const rm = p.medical_record_number?.toLowerCase() || '';
    return name.includes(term) || rm.includes(term);
  });

  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      visit_number: dataToUse?.visit_number || '',
      patient_id: dataToUse?.patient_id ? String(dataToUse.patient_id) : '',
      physiotherapist_id: dataToUse?.physiotherapist_id ? String(dataToUse.physiotherapist_id) : '',
      service_id: dataToUse?.service_id ? String(dataToUse.service_id) : '',
      examination_date: dataToUse?.examination_date ? dataToUse.examination_date.split('T')[0] : '',
      anamnesis: dataToUse?.anamnesis || '',
      diagnosis: dataToUse?.diagnosis || '',
      therapy: dataToUse?.therapy || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: MedicalRecordFormValues) => {
      const payload = {
        ...data,
        patient_id: data.patient_id,
        physiotherapist_id: data.physiotherapist_id,
        service_id: data.service_id || undefined,
        appointment_id: prefillData?.appointment_id || undefined,
      };
      return isEditing 
        ? medicalRecordService.updateMedicalRecord(initialData.id, payload)
        : medicalRecordService.createMedicalRecord(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records'] });
      toast.success(isEditing ? 'Rekam medis berhasil diperbarui' : 'Rekam medis berhasil ditambahkan');
      onSuccess();
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const onSubmit = (data: MedicalRecordFormValues) => {
    const formattedData = {
      ...data,
      examination_date: data.examination_date ? new Date(data.examination_date).toISOString() : undefined,
    };
    mutation.mutate(formattedData as any);
  };

  const selectedPatientId = form.watch('patient_id');
  const selectedPatient = patients.find((p: any) => String(p.id) === selectedPatientId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* --- Pasien & Fisioterapis --- */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patient_id"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-start">
                <FormLabel>Cari/Pilih Pasien *</FormLabel>
                <Select disabled={!!prefillData} onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Cari nama atau No. RM..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Ketik untuk mencari pasien..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredPatients.length === 0 ? (
                        <div className="p-2 text-sm text-slate-500 text-center">Data tidak ditemukan</div>
                      ) : (
                        filteredPatients.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} - {p.medical_record_number}
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
                {selectedPatient && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Pasien Terpilih:</p>
                    <p className="text-sm font-medium text-slate-900">No. RM: <span className="font-bold">{selectedPatient.medical_record_number}</span></p>
                    <p className="text-sm font-medium text-slate-900">Nama: <span className="font-bold">{selectedPatient.name}</span></p>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="examination_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal pemeriksaan *</FormLabel>
                <FormControl>
                  <Input type="date" disabled={!!prefillData} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isPhysio ? (
          // Fisioterapis: tampilkan nama sendiri (read-only), physiotherapist_id sudah di-set otomatis
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Layanan</FormLabel>
                  <Select disabled={!!prefillData} onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis layanan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Fisioterapisnya *</FormLabel>
              <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700">
                {currentPhysio?.name || user?.name || 'Anda (otomatis)'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Otomatis diisi sebagai fisioterapis yang login</p>
            </FormItem>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Layanan</FormLabel>
                  <Select disabled={!!prefillData} onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis layanan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
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
                  <FormLabel>Fisioterapisnya *</FormLabel>
                  <Select disabled={!!prefillData} onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
        )}

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-slate-600 mb-3">Detail Pemeriksaan</p>

          {/* --- Anamnesis --- */}
          <FormField
            control={form.control}
            name="anamnesis"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Hasil Anamnesis *</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Keluhan dan riwayat penyakit pasien..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* --- Diagnosa --- */}
          <FormField
            control={form.control}
            name="diagnosis"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Diagnosa *</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Diagnosa fisioterapi..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* --- Terapi --- */}
          <FormField
            control={form.control}
            name="therapy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Terapi *</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Terapi yang diberikan..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
