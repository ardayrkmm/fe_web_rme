import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Printer, FileText, Download, Share2, Copy, MessageCircle, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

import apiClient from '../../api/axios';
import { generateInvoicePdf } from '../../utils/invoicePdf';

export default function PaymentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentService.getPayment(id as string),
    enabled: !!id
  });
  const queryClient = useQueryClient();
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => {
      const payment = data?.data;
      if (!payment) throw new Error('Payment not found');
      return paymentService.updatePayment(id as string, { 
        ...payment, 
        patient_id: payment.patient_id,
        physiotherapist_id: payment.physiotherapist_id,
        therapy_session_id: payment.therapy_session_id,
        status: newStatus 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Status pembayaran berhasil diperbarui!');
    },
    onError: () => toast.error('Gagal memperbarui status pembayaran'),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading invoice...</div>;
  }

  const payment = data?.data;

  if (!payment) {
    return <div className="p-8 text-center text-slate-500">Invoice not found.</div>;
  }

  const getShareLink = () => `${window.location.origin}/payments/${id}`;

  const handleDownloadPdf = async () => {
    try {
      if (!payment) return;
      const doc = await generateInvoicePdf(payment);
      doc.save(`Invoice_${payment.invoice_number}.pdf`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Gagal mengunduh PDF');
    }
  };

  const handlePreviewPdf = async () => {
    try {
      if (!payment) return;
      const doc = await generateInvoicePdf(payment);
      const blob = doc.output('blob');
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error('Gagal membuka preview PDF');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink());
    toast.success('Link tersalin ke clipboard!');
  };

  const handleWhatsApp = () => {
    const text = `Halo Bapak/Ibu ${payment?.patient_name}\n\nTerima kasih telah melakukan terapi di Arummy Fisioterapi.\n\nBerikut kami lampirkan tautan untuk mengunduh invoice terapi Anda:\n${getShareLink()}\n\nSemoga lekas pulih.\n\nSalam,\nArummy Fisioterapi`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const subject = `Invoice Pembayaran Terapi - ${payment?.invoice_number}`;
    const body = `Halo Bapak/Ibu ${payment?.patient_name}\n\nTerima kasih telah melakukan terapi di Arummy Fisioterapi.\n\nBerikut kami lampirkan tautan untuk mengunduh invoice terapi Anda:\n${getShareLink()}\n\nSemoga lekas pulih.\n\nSalam,\nArummy Fisioterapi`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Invoice Pembayaran ${payment?.invoice_number}`,
        text: `Invoice pembayaran terapi Arummy Fisioterapi untuk ${payment?.patient_name}`,
        url: getShareLink(),
      }).catch(console.error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={() => navigate('/payments')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
        <div className="flex gap-2">
          {payment.status?.toLowerCase() !== 'lunas' && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={() => updateStatusMutation.mutate('Lunas')}
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Tandai Lunas (Checkout)
            </Button>
          )}
          <Button variant="outline" onClick={handlePreviewPdf}>
            <FileText className="w-4 h-4 mr-2" /> Preview PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Share2 className="w-4 h-4 mr-2" /> Bagikan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Bagikan Invoice</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button variant="outline" onClick={handleWhatsApp} className="h-14 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp
                </Button>
                <Button variant="outline" onClick={handleEmail} className="h-14">
                  <Mail className="w-5 h-5 mr-2" />
                  Email
                </Button>
                <Button variant="outline" onClick={handleCopyLink} className="h-14">
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Link
                </Button>
                {navigator.share && (
                  <Button variant="outline" onClick={handleNativeShare} className="h-14">
                    <Share2 className="w-5 h-5 mr-2" />
                    Lainnya...
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="print:shadow-none print:border-none shadow-sm border-slate-200">
        <CardHeader className="border-b pb-8 pt-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold tracking-widest text-slate-900">I N V O I C E</h1>
              <p className="text-slate-500 font-medium">No. {payment.invoice_number}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <h2 className="text-xl font-bold text-slate-800">Arummy FISIOTERAPI</h2>
              <p className="text-sm text-slate-500 max-w-[250px] mt-1 leading-relaxed">
                Terapi Rehabilitasi Fisik Profesional
                Neuro • Muskuloskeletal • Pediatric
                Bhayangkara Residence Klampok Blok A8
              </p>
              <div className="mt-4">
                <Badge className={
                  payment.status === 'Lunas' ? 'bg-green-100 text-green-800 border-green-200 text-sm py-1 px-4' : 
                  payment.status === 'Menunggu' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 text-sm py-1 px-4' : 
                  'bg-red-100 text-red-800 border-red-200 text-sm py-1 px-4'
                }>
                  {payment.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 space-y-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">KEPADA</h3>
              <p className="text-xl font-bold text-slate-900">{payment.patient_name?.toUpperCase()}</p>
              <p className="text-sm text-slate-500 mt-1">Sesi Terapi #{payment.therapy_session_id}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">TANGGAL PEMBAYARAN</h3>
              <p className="text-lg font-medium text-slate-900">
                {new Date(payment.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#dff5f8] text-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs">LAYANAN / TINDAKAN</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs text-right">BIAYA</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs text-center">QTY</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-xs text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(payment.details || payment.payment_details)?.map((detail: any) => (
                    <tr key={detail.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{(detail.item_name || detail.service_name || detail.name || 'LAYANAN TERAPI').toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4 text-right">Rp {Number(detail.price).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-center">{detail.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium">Rp {Number(detail.subtotal).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-80 space-y-4">
              <div className="flex justify-between text-sm px-4">
                <span className="font-bold text-slate-600">TOTAL</span>
                <span className="font-medium">Rp {Number(payment.subtotal).toLocaleString('id-ID')}</span>
              </div>
              {Number(payment.discount) > 0 && (
                <div className="flex justify-between text-sm px-4 text-green-600">
                  <span className="font-bold">DISKON</span>
                  <span className="font-medium">- Rp {Number(payment.discount).toLocaleString('id-ID')}</span>
                </div>
              )}
              {Number(payment.tax) > 0 && (
                <div className="flex justify-between text-sm px-4">
                  <span className="font-bold text-slate-600">PAJAK 10%</span>
                  <span className="font-medium">Rp {Number(payment.tax).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg bg-[#dff5f8] p-4 rounded-lg mt-2 text-slate-900">
                <span>TOTAL KESELURUHAN</span>
                <span>Rp {Number(payment.total).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-8 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">DIBAYARKAN KEPADA :</h3>
              <p className="text-base font-bold text-slate-900">Arummy FISIOTERAPI</p>
              <p className="text-sm text-slate-500 mt-2">Pembayaran Menggunakan</p>
              <p className="text-sm font-medium text-slate-700">{payment.payment_method || '-'}</p>
            </div>
            {payment.notes && (
              <div className="text-right">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">CATATAN</h3>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-lg inline-block text-left min-w-[200px]">{payment.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
