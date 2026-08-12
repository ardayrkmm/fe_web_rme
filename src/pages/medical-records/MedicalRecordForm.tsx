import { useState, useEffect, useRef } from 'react';
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

  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patient_id"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-start">
                <FormLabel>Cari/Pilih Pasien *</FormLabel>
                <div className="relative" ref={patientDropdownRef}>
                  <div
                    className={`flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white ${prefillData ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}
                    onClick={() => !prefillData && setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                  >
                    <span className={field.value ? 'text-slate-900' : 'text-slate-500'}>
                      {selectedPatient ? `${selectedPatient.name} - ${selectedPatient.medical_record_number}` : 'Pilih atau cari pasien...'}
                    </span>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50"><path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  </div>
                  
                  {isPatientDropdownOpen && !prefillData && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md outline-none">
                      <div className="p-2 border-b">
                        <Input
                          autoFocus
                          placeholder="Ketik nama atau No. RM..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1">
                        {filteredPatients.length === 0 ? (
                          <div className="py-6 text-center text-sm text-slate-500">Data tidak ditemukan</div>
                        ) : (
                          filteredPatients.map((p: any) => (
                            <div
                              key={p.id}
                              className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 ${field.value === String(p.id) ? 'bg-slate-100 font-medium' : ''}`}
                              onClick={() => {
                                field.onChange(String(p.id));
                                setIsPatientDropdownOpen(false);
                                setSearchTerm('');
                              }}
                            >
                              {p.name} - {p.medical_record_number}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Fisioterapisnya *</label>
                <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-700">
                  {currentPhysio?.name || user?.name || 'Anda (otomatis)'}
                </div>
                <p className="text-[0.8rem] text-slate-500">Otomatis diisi sebagai fisioterapis yang login</p>
              </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="flex flex-wrap justify-end gap-2 pt-4">
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
