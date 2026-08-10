import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title: string, columns: string[], data: any[]) => {
  // Use portrait
  const doc = new jsPDF('portrait');
  const pageWidth = doc.internal.pageSize.width;
  
  // Header / Kop Surat
  // Set text color to blue-800 (#1e40af -> rgb(30, 64, 175))
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  
  const clinicName = 'Arummy Fisioterapi';
  const nameWidth = doc.getTextWidth(clinicName);
  doc.text(clinicName, (pageWidth - nameWidth) / 2, 20);
  
  // Subtitles
  doc.setTextColor(71, 85, 105); // slate-600 (#475569)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const sub1 = 'Terapi Rehabilitasi Fisik Profesional';
  const sub2 = 'Neuro • Muskuloskeletal • Pediatric';
  const sub3 = 'Bhayangkara Residence Klampok BlokA8, Wanasari, Brebes';
  
  doc.text(sub1, (pageWidth - doc.getTextWidth(sub1)) / 2, 26);
  doc.text(sub2, (pageWidth - doc.getTextWidth(sub2)) / 2, 31);
  doc.text(sub3, (pageWidth - doc.getTextWidth(sub3)) / 2, 36);
  
  // Divider line (Double Line)
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(0.8);
  doc.line(14, 42, pageWidth - 14, 42);
  doc.setLineWidth(0.3);
  doc.line(14, 43.5, pageWidth - 14, 43.5);
  
  // Reset text color for body
  doc.setTextColor(0, 0, 0);
  
  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const titleText = `LAPORAN ${title.toUpperCase()}`;
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, 53);
  
  // Subtitle/Periode (Optional, just add date generated)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const dateText = `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, (pageWidth - dateWidth) / 2, 58);

  // Table
  autoTable(doc, {
    startY: 65,
    head: [columns],
    body: data,
    theme: 'grid',
    styles: { 
      fontSize: 8, // Keep font size small for portrait
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: { 
      fillColor: [245, 245, 245], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252]
    }
  });

  // Footer / Signature
  const finalY = (doc as any).lastAutoTable.finalY || 60;
  
  const today = new Date();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const signatureDate = `Brebes, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Right aligned signature for portrait
  const signatureX = pageWidth - 60;
  doc.text(signatureDate, signatureX, finalY + 20);
  doc.text('Penanggung Jawab', signatureX, finalY + 45);
  
  doc.save(`Laporan_${title.replace(/\s+/g, '_')}_${today.getTime()}.pdf`);
};

export const exportToExcel = (title: string, data: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  
  XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
};

export const printReport = (title: string, columns: string[], data: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  autoTable(doc, {
    startY: 35,
    head: [columns],
    body: data,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Utility to download a blob as a file in the browser.
 * 
 * @param blob - The Blob data from the response.
 * @param filename - The target filename to save as.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcelStyled = async (mainTitle: string, subTitle: string, data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  const keys = Object.keys(data[0]);
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = mainTitle;
  titleCell.font = { name: 'Arial', size: 14, bold: true };

  worksheet.mergeCells('C1:D1');
  const subTitleCell = worksheet.getCell('C1');
  subTitleCell.value = subTitle;
  subTitleCell.font = { name: 'Arial', size: 14, bold: true };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(keys);
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    if (colNumber <= 3) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4E4F9' } };
    }
  });

  data.forEach((rowData) => {
    const row = worksheet.addRow(keys.map(k => rowData[k] || '-'));
    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) maxLength = columnLength;
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};

