import { useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '../../services/patientService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

const patientSchema = z.object({
  nik: z.string().max(20).optional().or(z.literal('')),
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  patient_category_id: z.string().min(1, 'Kategori wajib diisi'),
  birth_date: z.string().min(1, 'Tanggal lahir wajib diisi'),
  gender_id: z.string().min(1, 'Jenis kelamin wajib diisi'),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  marital_status: z.string().optional().or(z.literal('')),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PatientForm({ initialData, onSuccess, onCancel }: PatientFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { data: categoriesData } = useQuery({
    queryKey: ['patient-categories'],
    queryFn: () => patientService.getCategories(),
  });
  const categories = categoriesData?.data || [];

  const { data: gendersData } = useQuery({
    queryKey: ['genders'],
    queryFn: () => patientService.getGenders(),
  });
  const genders = gendersData?.data || [];

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nik: initialData?.nik || '',
      name: initialData?.name || '',
      patient_category_id: initialData?.patient_category_id ? String(initialData.patient_category_id) : '',
      birth_date: initialData?.birth_date ? initialData.birth_date.split('T')[0] : '',
      gender_id: initialData?.gender_id ? String(initialData.gender_id) : '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      occupation: initialData?.occupation || '',
      marital_status: initialData?.marital_status || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PatientFormValues) => 
      isEditing 
        ? patientService.updatePatient(initialData.id, data)
        : patientService.createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success(isEditing ? 'Data pasien berhasil diperbarui' : 'Pasien berhasil ditambahkan');
      onSuccess();
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const categoryMutation = useMutation({
    mutationFn: (data: { name: string }) => patientService.createCategory(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-categories'] });
      toast.success('Kategori berhasil ditambahkan');
      setIsAddingCategory(false);
      setNewCategoryName('');
      if (data?.data?.id) {
        form.setValue('patient_category_id', data.data.id);
      }
    },
    onError: (error: any) => {
      handleApiError(error);
    }
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    categoryMutation.mutate({ name: newCategoryName });
  };

  const onSubmit = (data: PatientFormValues) => {
    const formattedData = {
      ...data,
      birth_date: data.birth_date ? new Date(data.birth_date).toISOString() : undefined,
    };
    mutation.mutate(formattedData as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patient_category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kategori *</FormLabel>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nama kategori..." 
                      value={newCategoryName} 
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      disabled={categoryMutation.isPending}
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddCategory} 
                      disabled={!newCategoryName.trim() || categoryMutation.isPending}
                    >
                      {categoryMutation.isPending ? '...' : 'Simpan'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setIsAddingCategory(false)}
                      disabled={categoryMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : undefined}>
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setIsAddingCategory(true)}
                      title="Tambah Kategori Baru"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nik"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIK (Identitas)</FormLabel>
                <FormControl>
                  <Input placeholder="16 digits NIK" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="birth_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tanggal Lahir *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jenis Kelamin *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ? field.value.toString() : undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {genders.map((g: any) => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        {g.name}
                      </SelectItem>
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
            name="marital_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status Pernikahan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                    <SelectItem value="Sudah Menikah">Sudah Menikah</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="occupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pekerjaan</FormLabel>
                <FormControl>
                  <Input placeholder="Pekerjaan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="0812..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alamat</FormLabel>
              <FormControl>
                <Input placeholder="Alamat pasien..." {...field} />
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
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Pasien'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
