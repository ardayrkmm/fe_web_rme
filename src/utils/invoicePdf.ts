import type { Payment } from '../services/paymentService';

export function generateInvoicePdf(row: Payment) {
  return Promise.all([
    import('jspdf'),
  ]).then(([jsPDFMod]) => {
    const jsPDF = jsPDFMod.default;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pw = doc.internal.pageSize.width;
    
    // Helper function for light text
    const setGrayText = () => doc.setTextColor(120, 128, 139); // text-slate-500
    const setBlackText = () => doc.setTextColor(15, 23, 42); // text-slate-900
    const setBlueText = () => doc.setTextColor(29, 78, 216); // text-blue-700
    const setLightGrayText = () => doc.setTextColor(148, 163, 184); // text-slate-400

    let y = 30;

    // --- Header ---
    
    // Top Left: INVOICE and Number
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('I N V O I C E', 20, y);
    
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`No. ${row.invoice_number || '-'}`, 21, y + 8);

    // Top Right: Clinic Info
    const rightMargin = pw - 20;
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Arummy Fisioterapi', rightMargin, y - 5, { align: 'right' });
    
    setBlueText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Terapi Rehabilitasi Fisik Profesional', rightMargin, y, { align: 'right' });
    
    setGrayText();
    doc.text('Neuro • Muskuloskeletal • Pediatric', rightMargin, y + 4, { align: 'right' });
    doc.text('Bhayangkara Residence Klampok', rightMargin, y + 8, { align: 'right' });
    doc.text('Blok A8', rightMargin, y + 12, { align: 'right' });

    // Status Badge (Lunas)
    const statusText = (row.payment_status || 'Lunas').toUpperCase();
    const isLunas = statusText === 'LUNAS';
    const badgeW = 18;
    const badgeH = 6;
    const badgeX = rightMargin - badgeW;
    const badgeY = y + 15;
    
    if (isLunas) {
      doc.setFillColor(220, 252, 231); // bg-green-100
      doc.setDrawColor(220, 252, 231);
      doc.setTextColor(22, 163, 74); // text-green-600
    } else {
      doc.setFillColor(254, 243, 199); // bg-amber-100
      doc.setDrawColor(254, 243, 199);
      doc.setTextColor(217, 119, 6); // text-amber-600
    }
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(statusText, badgeX + (badgeW / 2), badgeY + 4, { align: 'center' });

    y += 35;

    // --- Divider ---
    doc.setDrawColor(226, 232, 240); // border-slate-200
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    
    y += 15;

    // --- Customer & Date Info ---
    // Middle Left: KEPADA
    setGrayText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('KEPADA', 20, y);

    y += 6;
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(row.patient_name?.toUpperCase() || '-', 20, y);
    
    y += 5;
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Sesi Terapi #${row.therapy_session_id || '-'}`, 20, y);

    // Middle Right: TANGGAL PEMBAYARAN
    const dateY = y - 11;
    setGrayText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TANGGAL PEMBAYARAN', rightMargin, dateY, { align: 'right' });

    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(row.payment_date ? new Date(row.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', rightMargin, dateY + 6, { align: 'right' });

    y += 15;

    // --- Table Header ---
    doc.setFillColor(223, 245, 248); // Light cyan background (similar to UI)
    doc.roundedRect(20, y, pw - 40, 10, 1.5, 1.5, 'F');
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('LAYANAN / TINDAKAN', 25, y + 6.5);
    doc.text('BIAYA', 130, y + 6.5, { align: 'right' });
    doc.text('QTY', 150, y + 6.5, { align: 'center' });
    doc.text('TOTAL', rightMargin - 5, y + 6.5, { align: 'right' });

    y += 18;

    // --- Table Items ---
    const details = (row as any).details || (row as any).payment_details || [];
    details.forEach((d: any) => {
      setBlackText();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text((d.item_name || d.service_name || d.name || 'LAYANAN TERAPI').toUpperCase(), 25, y);
      
      setGrayText();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Rp ${Number(d.price || 0).toLocaleString('id-ID')}`, 130, y, { align: 'right' });
      doc.text(`${d.quantity || 1}`, 150, y, { align: 'center' });
      
      setBlackText();
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${Number(d.subtotal || 0).toLocaleString('id-ID')}`, rightMargin - 5, y, { align: 'right' });
      
      y += 10;
    });

    // Dotted or solid line separator
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, y, pw - 20, y);
    
    y += 12;

    // --- Summary ---
    const totalWOTax = details.reduce((sum: number, d: any) => sum + Number(d.subtotal || 0), 0);
    
    // Bottom Right calculations
    let summaryY = y;
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL', 140, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rp ${totalWOTax.toLocaleString('id-ID')}`, rightMargin - 5, summaryY, { align: 'right' });
    
    summaryY += 8;

    if (Number(row.discount) > 0) {
      setGrayText();
      doc.setFont('helvetica', 'bold');
      doc.text('DISKON', 140, summaryY);
      doc.setFont('helvetica', 'normal');
      doc.text(`- Rp ${Number(row.discount).toLocaleString('id-ID')}`, rightMargin - 5, summaryY, { align: 'right' });
      summaryY += 8;
    }

    if (Number(row.tax) > 0) {
      setGrayText();
      doc.setFont('helvetica', 'bold');
      doc.text('PAJAK', 140, summaryY);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${Number(row.tax).toLocaleString('id-ID')}`, rightMargin - 5, summaryY, { align: 'right' });
      summaryY += 8;
    }

    summaryY += 2;

    // Grand Total Background (Bottom Right)
    doc.setFillColor(223, 245, 248);
    doc.roundedRect(135, summaryY, (pw - 20) - 135, 14, 1.5, 1.5, 'F');
    
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', 140, summaryY + 6);
    doc.text('KESELURUHAN', 140, summaryY + 11);
    
    doc.text('Rp', rightMargin - 20, summaryY + 6);
    doc.text(`${Number(row.total).toLocaleString('id-ID')}`, rightMargin - 5, summaryY + 11, { align: 'right' });

    // --- Footer (Bottom Left) ---
    // Start footer at the same Y as the summary
    y += 2;
    setLightGrayText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DIBAYARKAN KEPADA :', 20, y);
    
    y += 6;
    setBlackText();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Arummy Fisioterapi', 20, y);
    
    y += 6;
    setGrayText();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Pembayaran Menggunakan', 20, y);
    
    y += 5;
    setBlackText();
    doc.text((row.payment_method || '-').toLowerCase(), 20, y);

    return doc;
  });
}

