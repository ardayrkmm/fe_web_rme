import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceCategoryService } from '../../services/serviceCategoryService';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

interface ServiceCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceCategoryDialog({ open, onOpenChange }: ServiceCategoryDialogProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => serviceCategoryService.getCategories(1, 100),
    enabled: open,
  });

  const categories = Array.isArray(categoriesData?.data?.data) ? categoriesData.data.data :
                     Array.isArray(categoriesData?.data) ? categoriesData.data :
                     Array.isArray(categoriesData) ? categoriesData : [];

  const createMutation = useMutation({
    mutationFn: serviceCategoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Kategori berhasil ditambahkan');
      setNewName('');
      setIsAdding(false);
    },
    onError: () => toast.error('Gagal menambahkan kategori'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) => serviceCategoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Kategori berhasil diperbarui');
      setEditingId(null);
    },
    onError: () => toast.error('Gagal memperbarui kategori'),
  });

  const deleteMutation = useMutation({
    mutationFn: serviceCategoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      toast.success('Kategori berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus kategori'),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id, data: { name: editName } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus kategori ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Kelola Kategori Layanan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-slate-700">Daftar Kategori</h4>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)} className="h-8">
                <Plus className="w-4 h-4 mr-1" /> Tambah
              </Button>
            )}
          </div>
          
          <div className="border rounded-md max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead className="w-[100px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAdding && (
                  <TableRow>
                    <TableCell>
                      <Input 
                        autoFocus
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        placeholder="Nama kategori baru..."
                        className="h-8"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleCreate} disabled={createMutation.isPending}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => setIsAdding(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-slate-500">Memuat...</TableCell>
                  </TableRow>
                ) : categories.length === 0 && !isAdding ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4 text-slate-500">Belum ada kategori.</TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat: any) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        {editingId === cat.id ? (
                          <Input 
                            autoFocus
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                          />
                        ) : (
                          <span>{cat.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {editingId === cat.id ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUpdate(cat.id)} disabled={updateMutation.isPending}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(cat.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
