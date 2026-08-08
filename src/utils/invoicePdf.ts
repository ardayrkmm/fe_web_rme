import type { Payment } from '../services/paymentService';

export function generateInvoicePdf(row: Payment) {
  return Promise.all([
    import('jspdf'),
  ]).then(([jsPDFMod]) => {
    const jsPDF = jsPDFMod.default;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pw = doc.internal.pageSize.width;
    
    // Helper function for light text
    const setGrayText = () => doc.setTextColor(100, 100, 100);
    const setBlackText = () => doc.setTextColor(0, 0, 0);

    // --- Header ---
    let y = 30;

    // Left side
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('I N V O I C E', 20, y);
    
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`No. ${row.invoice_number || '-'}`, 21, y + 8);

    // Right side
    setGrayText();
    doc.setFontSize(10);
    doc.text('KEPADA', 120, y - 8);

    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(row.patient_name?.toUpperCase() || '-', 120, y - 2);
    
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(row.payment_date ? new Date(row.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '', 120, y + 3);

    y += 25;

    // --- Table Header ---
    doc.setFillColor(223, 245, 248); // Light cyan background
    doc.rect(20, y, pw - 40, 10, 'F');
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LAYANAN / TINDAKAN', 25, y + 6.5);
    doc.text('BIAYA', 120, y + 6.5);
    doc.text('QTY', 150, y + 6.5, { align: 'center' });
    doc.text('TOTAL', 185, y + 6.5, { align: 'right' });

    y += 18;

    // --- Table Items ---
    const details = (row as any).details || (row as any).payment_details || [];
    details.forEach((d: any) => {
      setBlackText();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text((d.item_name || d.service_name || d.name || 'LAYANAN TERAPI').toUpperCase(), 25, y);
      
      setBlackText();
      doc.setFontSize(10);
      doc.text(`Rp. ${Number(d.price || 0).toLocaleString('id-ID')}`, 120, y);
      doc.text(`${d.quantity || 1}`, 150, y, { align: 'center' });
      doc.text(`Rp. ${Number(d.subtotal || 0).toLocaleString('id-ID')}`, 185, y, { align: 'right' });
      
      y += 10;
    });

    // Dotted or solid line separator
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    
    y += 15;

    // --- Summary ---
    const totalWOTax = details.reduce((sum: number, d: any) => sum + Number(d.subtotal || 0), 0);
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL', 25, y);
    doc.text(`Rp. ${totalWOTax.toLocaleString('id-ID')}`, 185, y, { align: 'right' });
    
    y += 8;

    if (Number(row.discount) > 0) {
      setGrayText();
      doc.setFont('helvetica', 'normal');
      doc.text('DISKON', 25, y);
      doc.text(`- Rp. ${Number(row.discount).toLocaleString('id-ID')}`, 185, y, { align: 'right' });
      y += 8;
    }

    if (Number(row.tax) > 0) {
      setGrayText();
      doc.setFont('helvetica', 'normal');
      doc.text('PAJAK', 25, y);
      doc.text(`Rp. ${Number(row.tax).toLocaleString('id-ID')}`, 185, y, { align: 'right' });
      y += 8;
    }

    y += 4;

    // Grand Total Background
    doc.setFillColor(223, 245, 248);
    doc.rect(20, y, pw - 40, 10, 'F');
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL KESELURUHAN', 25, y + 6.5);
    doc.text(`Rp. ${Number(row.total).toLocaleString('id-ID')}`, 185, y + 6.5, { align: 'right' });

    y += 25;

    // --- Footer ---
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('DIBAYARKAN KEPADA :', 25, y);
    
    y += 7;
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Arummy Fisioterapi', 25, y);
    
    y += 5;
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Pembayaran Menggunakan', 25, y);
    y += 5;
    doc.text(row.payment_method || '-', 25, y);

    return doc;
  });
}
