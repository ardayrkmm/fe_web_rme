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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { physiotherapistService } from '../../services/physiotherapistService';
import { handleApiError } from '../../utils/errorHandler';
import { toast } from 'sonner';

import { Eye, EyeOff } from 'lucide-react';

const physiotherapistSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255),
  specialization: z.string().max(255).optional().or(z.literal('')),
  sip: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().min(1, 'No. telepon wajib diisi').max(50),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gender: z.enum(['L', 'P'], { message: 'Gender wajib dipilih' }),
  status: z.enum(['active', 'inactive']).optional(),
});

type PhysiotherapistFormValues = z.infer<typeof physiotherapistSchema>;

interface PhysiotherapistFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PhysiotherapistForm({ initialData, onSuccess, onCancel }: PhysiotherapistFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<PhysiotherapistFormValues>({
    resolver: zodResolver(physiotherapistSchema),
    defaultValues: {
      name: initialData?.name || '',
      specialization: initialData?.specialization || '',
      sip: initialData?.sip || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      password: '',
      address: initialData?.address || '',
      gender: initialData?.gender || 'L',
      status: initialData?.status || 'active',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PhysiotherapistFormValues) => {
      const payload = {
        ...data,
      };
      return isEditing
        ? physiotherapistService.updatePhysiotherapist(initialData.id, payload)
        : physiotherapistService.createPhysiotherapist(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physiotherapists'] });
      toast.success(isEditing ? 'Data fisioterapis berhasil diperbarui' : 'Fisioterapis berhasil ditambahkan');
      onSuccess();
    },
    onError: (error: any) => {
      handleApiError(error, form.setError);
    },
  });

  const onSubmit = (data: PhysiotherapistFormValues) => {
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
              <FormLabel>Nama *</FormLabel>
              <FormControl>
                <Input placeholder="Nama fisioterapis" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Spesialis</FormLabel>
              <FormControl>
                <Input placeholder="Spesialisasi..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor SIP</FormLabel>
                <FormControl>
                  <Input placeholder="SIP..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No. Telepon *</FormLabel>
                <FormControl>
                  <Input placeholder="08..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jenis Kelamin *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
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
                <Input placeholder="Alamat lengkap..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@contoh.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password Akun (Akan otomatis dibuatkan akses Fisioterapis)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Minimal 6 karakter" 
                      {...field} 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Fisioterapis'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
