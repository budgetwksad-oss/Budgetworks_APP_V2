import jsPDF from 'jspdf';

export interface QuotePDFData {
  quoteNumber?: string | null;
  date: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceLabel: string;
  location: string;
  preferredDate?: string | null;
  estimateLow: number;
  estimateHigh: number;
  expectedPrice?: number | null;
  capAmount?: number | null;
  taxRate: number;
  notes?: string | null;
  companyName?: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
}

export function downloadQuotePDF(data: QuotePDFData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const fmt = (n: number) =>
    n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const _line = (text: string, x: number, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(text, x, y);
  };

  const br = (gap = 14) => { y += gap; };

  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, pageW, 90, 'F');

  y = 38;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(data.companyName || 'BudgetWorks', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const companyLines: string[] = [];
  if (data.companyAddress) companyLines.push(data.companyAddress);
  if (data.companyPhone) companyLines.push(data.companyPhone);
  if (data.companyEmail) companyLines.push(data.companyEmail);
  if (companyLines.length) {
    doc.text(companyLines.join('  |  '), margin, y + 16);
  }

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('QUOTE', pageW - margin, 38, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const rightLines: string[] = [];
  if (data.quoteNumber) rightLines.push(`Quote #: ${data.quoteNumber}`);
  rightLines.push(`Date: ${data.date}`);
  doc.text(rightLines.join('   '), pageW - margin, 54, { align: 'right' });

  y = 106;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  br(16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('PREPARED FOR', margin, y);
  br(14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(data.customerName, margin, y);
  br(13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (data.customerEmail) { doc.text(data.customerEmail, margin, y); br(12); }
  if (data.customerPhone) { doc.text(data.customerPhone, margin, y); br(12); }

  br(6);
  doc.line(margin, y, pageW - margin, y);
  br(16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('SERVICE DETAILS', margin, y);
  br(14);

  const detailRows: [string, string][] = [
    ['Service', data.serviceLabel],
    ['Location', data.location],
  ];
  if (data.preferredDate) {
    detailRows.push(['Preferred Date', new Date(data.preferredDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]);
  }

  for (const [label, value] of detailRows) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(value, margin + 110, y);
    br(14);
  }

  br(8);
  doc.line(margin, y, pageW - margin, y);
  br(16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('ESTIMATE', margin, y);
  br(16);

  const boxX = margin;
  const boxW = pageW - margin * 2;
  const boxH = 64;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(boxX, y, boxW, boxH, 6, 6, 'FD');

  const col1 = boxX + 20;
  const col2 = boxX + boxW / 3 + 20;
  const col3 = boxX + (boxW * 2) / 3 + 20;
  const labelY = y + 18;
  const valY = y + 38;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Low Estimate', col1, labelY);
  doc.text('Expected', col2, labelY);
  doc.text('High Estimate', col3, labelY);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(fmt(data.estimateLow), col1, valY);
  doc.setTextColor(20, 120, 60);
  doc.text(fmt(data.expectedPrice ?? data.estimateHigh), col2, valY);
  doc.setTextColor(30, 30, 30);
  doc.text(fmt(data.estimateHigh), col3, valY);

  y += boxH + 14;

  if (data.taxRate > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`All prices include applicable tax (${(data.taxRate * 100).toFixed(1)}% HST/GST).`, margin, y);
    br(14);
  }

  if (data.capAmount) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 80, 0);
    doc.text(`Not-to-exceed (cap): ${fmt(data.capAmount)}`, margin, y);
    br(14);
  }

  if (data.notes) {
    br(8);
    doc.line(margin, y, pageW - margin, y);
    br(16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('NOTES', margin, y);
    br(14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const wrapped = doc.splitTextToSize(data.notes, boxW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13;
  }

  br(20);
  doc.line(margin, y, pageW - margin, y);
  br(14);

  const terms = [
    'This quote is valid for 14 days from the date issued.',
    'Final pricing may vary based on actual job scope and conditions.',
    'A deposit may be required to confirm your booking.',
  ];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(140, 140, 140);
  for (const t of terms) {
    doc.text(`• ${t}`, margin, y);
    br(12);
  }

  const filename = `quote${data.quoteNumber ? `-${data.quoteNumber}` : ''}-${data.customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}
