import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ExportPdfDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (mode: 'all' | 'month', monthStr?: string) => void;
  isExporting: boolean;
}

export function ExportPdfDialog({ isOpen, onClose, onExport, isExporting }: ExportPdfDialogProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const [mode, setMode] = useState<'all' | 'month'>('all');
  const [selectedM, setSelectedM] = useState(currentMonth);
  const [selectedY, setSelectedY] = useState(String(currentYear));

  const handleExport = () => {
    const monthStr = `${selectedY}-${selectedM}`;
    onExport(mode, mode === 'month' ? monthStr : undefined);
  };

  const months = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pilihan Cetak Laporan PDF</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-3">
            <Label className="text-base font-semibold">Pilih Periode Cetak</Label>
            
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="all" 
                name="export_mode" 
                value="all" 
                checked={mode === 'all'} 
                onChange={() => setMode('all')}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="all" className="cursor-pointer">Semua Waktu (Seluruh Data)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="month" 
                name="export_mode" 
                value="month" 
                checked={mode === 'month'} 
                onChange={() => setMode('month')}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="month" className="cursor-pointer">Pilih Bulan Tertentu</Label>
            </div>
          </div>

          {mode === 'month' && (
            <div className="mt-2 pl-6 flex gap-3">
              <div className="w-1/2">
                <Label className="mb-2 block text-sm text-slate-500">Bulan</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={selectedM}
                  onChange={(e) => setSelectedM(e.target.value)}
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-1/2">
                <Label className="mb-2 block text-sm text-slate-500">Tahun</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={selectedY}
                  onChange={(e) => setSelectedY(e.target.value)}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>Batal</Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || (mode === 'month' && (!selectedM || !selectedY))}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isExporting ? 'Mencetak...' : 'Lanjutkan Cetak'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
