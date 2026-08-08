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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceMasterService } from '../../services/serviceMasterService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';
import { serviceCategoryService } from '../../services/serviceCategoryService';
import { ServiceCategoryDialog } from './ServiceCategoryDialog';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const serviceSchema = z.object({
  name: z.string().min(1, 'Nama Layanan wajib diisi').max(255),
  category: z.string().min(1, 'Kategori wajib diisi').max(100),
  duration: z.coerce.number().min(1, 'Durasi minimal 1 menit'),
  price: z.coerce.number().min(0, 'Harga tidak boleh kurang dari 0'),
  description: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ServiceMasterForm({ initialData, onSuccess, onCancel }: ServiceFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => serviceCategoryService.getCategories(1, 100),
  });
  
  const categories = Array.isArray(categoriesData?.data?.data) ? categoriesData.data.data :
                     Array.isArray(categoriesData?.data) ? categoriesData.data :
                     Array.isArray(categoriesData) ? categoriesData : [];

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || '',
      duration: initialData?.duration || 30,
      price: initialData?.price || 0,
      description: initialData?.description || '',
      is_active: initialData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ServiceFormValues) => 
      isEditing 
        ? serviceMasterService.updateService(initialData.id, data)
        : serviceMasterService.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(isEditing ? 'Layanan berhasil diperbarui' : 'Layanan berhasil ditambahkan');
      onSuccess();
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Layanan *</FormLabel>
              <FormControl>
                <Input placeholder="Nama layanan..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Kategori *</FormLabel>
                <Button 
                  type="button" 
                  variant="link" 
                  className="h-auto p-0 text-xs text-blue-600" 
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  Kelola Kategori
                </Button>
              </div>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-sm p-2 text-slate-500 text-center">Belum ada kategori.</div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durasi (menit) *</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Harga *</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Input placeholder="Deskripsi layanan..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === 'true')} value={field.value ? 'true' : 'false'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
      <ServiceCategoryDialog 
        open={isCategoryDialogOpen} 
        onOpenChange={setIsCategoryDialogOpen} 
      />
    </Form>
  );
}
