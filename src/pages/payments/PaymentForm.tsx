import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { paymentService } from '../../services/paymentService';
import { patientService } from '../../services/patientService';
import { physiotherapistService } from '../../services/physiotherapistService';
import { therapySessionService } from '../../services/therapySessionService';
import { serviceMasterService } from '../../services/serviceMasterService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Trash2, Plus } from 'lucide-react';

const detailSchema = z.object({
  service_master_id: z.string().min(1, 'Layanan wajib dipilih'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
  price: z.coerce.number().min(0),
});

const paymentSchema = z.object({
  therapy_session_id: z.string().optional(),
  appointment_id: z.string().optional(),
  patient_id: z.string().min(1, 'Pasien wajib dipilih'),
  physiotherapist_id: z.string().min(1, 'Fisioterapis wajib dipilih'),
  payment_date: z.string().min(1, 'Tanggal wajib diisi'),
  payment_method: z.enum(['Tunai', 'Transfer', 'QRIS', 'Debit', 'Kredit']),
  status: z.enum(['Menunggu', 'Lunas', 'Dibatalkan']),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().optional().or(z.literal('')),
  details: z.array(detailSchema).min(1, 'Minimal satu layanan wajib dipilih'),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;


export default function PaymentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  
  const createFromSession = location.state?.createFromSession;

  // We fetch master data to populate dropdowns
  const { data: patientsData } = useQuery({ queryKey: ['patients', 'all'], queryFn: () => patientService.getPatients(1, 100) });
  const { data: physiosData } = useQuery({ queryKey: ['physiotherapists', 'all'], queryFn: () => physiotherapistService.getPhysiotherapists(1, 100) });
  const { data: sessionsData } = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => therapySessionService.getTherapySessions(1, 100) });
  const { data: servicesData } = useQuery({ queryKey: ['services', 'all'], queryFn: () => serviceMasterService.getServices(1, 100) });

  const { data: paymentData, isLoading: isPaymentLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentService.getPayment(id as string),
    enabled: isEditing,
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      therapy_session_id: createFromSession?.therapy_session?.id ? String(createFromSession.therapy_session.id) : (createFromSession?.id ? String(createFromSession.id) : ''),
      appointment_id: createFromSession?.appointment?.id ? String(createFromSession.appointment.id) : (createFromSession?.appointment_id ? String(createFromSession.appointment_id) : ''),
      patient_id: createFromSession?.appointment?.patient_id ? String(createFromSession.appointment.patient_id) : (createFromSession?.patient_id ? String(createFromSession.patient_id) : ''),
      physiotherapist_id: createFromSession?.appointment?.physiotherapist_id ? String(createFromSession.appointment.physiotherapist_id) : (createFromSession?.physiotherapist_id ? String(createFromSession.physiotherapist_id) : ''),
      payment_date: new Date().toISOString().slice(0, 16),
      payment_method: 'Tunai',
      status: 'Menunggu',
      discount: 0,
      tax: 0,
      notes: '',
      details: [{ 
        service_master_id: createFromSession?.appointment?.service_master_id ? String(createFromSession.appointment.service_master_id) : (createFromSession?.service_master_id ? String(createFromSession.service_master_id) : ''), 
        quantity: 1, 
        price: 0 
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details",
  });

  const mutation = useMutation({
    mutationFn: (data: PaymentFormValues) => 
      isEditing 
        ? paymentService.updatePayment(id as string, data)
        : paymentService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(isEditing ? 'Pembayaran diupdate' : 'Pembayaran berhasil dibuat');
      navigate('/payments');
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const watchDetails = form.watch("details");
  const watchDiscount = form.watch("discount");
  const watchTax = form.watch("tax");

  const subtotal = watchDetails.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity) || 0), 0);
  const total = subtotal - Number(watchDiscount) + Number(watchTax);

  const onSubmit = (data: PaymentFormValues) => {
    const formattedData: any = {
      ...data,
      payment_details: data.details,
      payment_date: data.payment_date ? new Date(data.payment_date).toISOString() : undefined,
    };
    delete formattedData.details;
    mutation.mutate(formattedData);
  };

  // If a session is selected, auto-fill patient and physio
  const watchSession = form.watch('therapy_session_id');
  useEffect(() => {
    if (watchSession && sessionsData?.data?.data && !isEditing) {
      const session = sessionsData.data.data.find((s: any) => String(s.id) === String(watchSession));
      if (session) {
        form.setValue('patient_id', String(session.patient_id));
        form.setValue('physiotherapist_id', String(session.physiotherapist_id));
        
        let newDetails: any[] = [];
        const ids = session.service_master_ids?.length ? session.service_master_ids : (session.service_master_id ? [session.service_master_id] : []);
        
        if (ids.length > 0) {
            newDetails = ids.map((id: string) => {
               const svc = servicesData?.data?.data?.find((s: any) => String(s.id) === String(id));
               return {
                 service_master_id: String(id),
                 quantity: 1,
                 price: svc ? Number(svc.price) : 0
               };
            });
            form.setValue('details', newDetails);
        }
      }
    }
  }, [watchSession, sessionsData, servicesData, isEditing, form]);

  useEffect(() => {
    if (isEditing && paymentData?.data) {
      const pd = paymentData.data;
      
      const pDetails = pd.payment_details && pd.payment_details.length > 0 
        ? pd.payment_details.map((d: any) => ({
            service_master_id: d.service_master_id ? String(d.service_master_id) : '',
            quantity: d.quantity || 1,
            price: d.price || 0
          }))
        : [{ service_master_id: '', quantity: 1, price: 0 }];

      form.reset({
        therapy_session_id: pd.therapy_session_id ? String(pd.therapy_session_id) : '',
        appointment_id: pd.appointment_id ? String(pd.appointment_id) : '',
        patient_id: pd.patient_id ? String(pd.patient_id) : '',
        physiotherapist_id: pd.physiotherapist_id ? String(pd.physiotherapist_id) : '',
        payment_date: pd.payment_date ? pd.payment_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
        payment_method: pd.payment_method === 'cash' ? 'Tunai' : (pd.payment_method ? pd.payment_method.charAt(0).toUpperCase() + pd.payment_method.slice(1) : 'Tunai'),
        status: pd.status ? pd.status.charAt(0).toUpperCase() + pd.status.slice(1) : 'Menunggu',
        discount: pd.discount || 0,
        tax: pd.tax || 0,
        notes: pd.notes || '',
        details: pDetails,
      });
    }
  }, [isEditing, paymentData, form]);

  if (isEditing && isPaymentLoading) {
    return <div className="p-8 text-center text-slate-500">Memuat data pembayaran...</div>;
  }

  // Prevent rendering form until master data is loaded so Select components don't get stuck on placeholders
  const isMasterDataLoading = sessionsData === undefined || patientsData === undefined || physiosData === undefined || servicesData === undefined;
  if (isMasterDataLoading) {
    return <div className="p-8 text-center text-slate-500">Memuat data master...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditing ? 'Ubah Pembayaran' : 'Buat Pembayaran Baru'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Utama</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="therapy_session_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sesi Terapi</FormLabel>
                    {isEditing ? (
                      <div className="p-2 border rounded-md bg-slate-50 text-slate-500 text-sm">
                        {field.value 
                          ? (() => {
                              const s = sessionsData?.data?.data?.find((x: any) => String(x.id) === String(field.value));
                              return s ? `Sesi #${s.id} - ${s.patient?.name}` : field.value;
                            })()
                          : '-'}
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sesi..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sessionsData?.data?.data?.map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>Sesi #{s.id} - {s.patient?.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Pembayaran</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasien</FormLabel>
                    {isEditing ? (
                      <div className="p-2 border rounded-md bg-slate-50 text-slate-500 text-sm">
                        {patientsData?.data?.data?.find((p: any) => String(p.id) === String(field.value))?.name || '-'}
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih pasien..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patientsData?.data?.data?.map((p: any) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="physiotherapist_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fisioterapis</FormLabel>
                    {isEditing ? (
                      <div className="p-2 border rounded-md bg-slate-50 text-slate-500 text-sm">
                        {physiosData?.data?.data?.find((p: any) => String(p.id) === String(field.value))?.name || '-'}
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih fisioterapis..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {physiosData?.data?.data?.map((p: any) => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metode Pembayaran</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih metode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Tunai', 'Transfer', 'QRIS', 'Debit', 'Kredit'].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Menunggu', 'Lunas', 'Dibatalkan'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Layanan</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ service_master_id: '', quantity: 1, price: 0 })}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Layanan
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`details.${index}.service_master_id`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Layanan</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              f.onChange(val);
                              // Auto update price
                              const srv = servicesData?.data?.data?.find((s:any) => s.id === String(val));
                              if (srv) {
                                form.setValue(`details.${index}.price`, Number(srv.price));
                              }
                            }} 
                            value={f.value ? String(f.value) : ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih layanan..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {servicesData?.data?.data?.map((s: any) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name} - Rp {Number(s.price).toLocaleString('id-ID')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-24">
                    <FormField
                      control={form.control}
                      name={`details.${index}.quantity`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Qty</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-48">
                    <FormField
                      control={form.control}
                      name={`details.${index}.price`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Harga</FormLabel>
                          <FormControl>
                            <Input type="number" disabled {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pt-8">
                    <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => remove(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-sm ml-auto">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4">
                      <FormLabel className="shrink-0 text-slate-500 font-normal">Diskon (Rp)</FormLabel>
                      <div className="flex-1">
                        <FormControl>
                          <Input type="number" className="text-right" {...field} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4">
                      <FormLabel className="shrink-0 text-slate-500 font-normal">Pajak (Rp)</FormLabel>
                      <div className="flex-1">
                        <FormControl>
                          <Input type="number" className="text-right" {...field} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-xl font-bold text-primary">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan</FormLabel>
                      <FormControl>
                        <Input placeholder="Tambahkan catatan jika ada..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/payments')}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
