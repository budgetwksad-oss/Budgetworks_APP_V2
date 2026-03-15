import jsPDF from 'jspdf';
import type { PricingBreakdownLine } from './pricingEngine';

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
  scopeSummary?: string | null;
  advisoryNotes?: string[];
  breakdownLines?: PricingBreakdownLine[];
}

export function downloadQuotePDF(data: QuotePDFData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const fmt = (n: number) =>
    n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });

  const br = (gap = 14) => { y += gap; };

  const ensureSpace = (needed: number) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Header band ──────────────────────────────────────────────
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
  else companyLines.push('Halifax, NS');
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

  // ── Prepared for ─────────────────────────────────────────────
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

  // ── Service Details ───────────────────────────────────────────
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
    const parsedDate = new Date(data.preferredDate + 'T12:00:00');
    detailRows.push(['Preferred Date', parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]);
  }
  if (data.scopeSummary) {
    detailRows.push(['Scope', data.scopeSummary]);
  }

  const labelColX = margin;
  const valueColX = margin + 110;
  const valueColW = pageW - margin - valueColX - 12;

  for (const [label, value] of detailRows) {
    ensureSpace(20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label, labelColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const wrapped = doc.splitTextToSize(value, valueColW);
    doc.text(wrapped, valueColX, y);
    br(wrapped.length > 1 ? wrapped.length * 13 : 14);
  }

  // ── Advisory Notes (customer-facing) ─────────────────────────
  if (data.advisoryNotes && data.advisoryNotes.length > 0) {
    br(6);
    doc.line(margin, y, pageW - margin, y);
    br(14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('IMPORTANT NOTES', margin, y);
    br(12);

    const boxW = pageW - margin * 2;
    for (const note of data.advisoryNotes) {
      ensureSpace(36);
      const wrapped = doc.splitTextToSize(`• ${note}`, boxW - 24);
      const noteH = Math.max(28, wrapped.length * 13 + 12);

      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(245, 190, 80);
      doc.roundedRect(margin, y - 6, boxW, noteH, 4, 4, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 80, 10);
      doc.text(wrapped, margin + 10, y + 7);
      y += noteH + 6;
    }
  }

  br(8);
  doc.line(margin, y, pageW - margin, y);
  br(16);

  // ── Estimate ──────────────────────────────────────────────────
  ensureSpace(100);
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
    doc.text(`All prices include Nova Scotia HST (${(data.taxRate * 100).toFixed(0)}%).`, margin, y);
    br(14);
  }

  if (data.capAmount) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 80, 0);
    doc.text(`Not-to-exceed (cap): ${fmt(data.capAmount)}`, margin, y);
    br(14);
  }

  // ── Breakdown table (customer-facing — no staffing) ───────────
  const printableLines = (data.breakdownLines ?? []).filter(
    (l) => !l.label.toLowerCase().includes('staffing') && !l.label.toLowerCase().includes('crew')
  );

  if (printableLines.length > 0) {
    br(4);
    ensureSpace(printableLines.length * 16 + 40);
    doc.line(margin, y, pageW - margin, y);
    br(14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('PRICE BREAKDOWN', margin, y);
    br(12);

    const rightCol = pageW - margin;
    for (let i = 0; i < printableLines.length; i++) {
      const line = printableLines[i];
      const isHst = line.label.toLowerCase().includes('hst');
      const isAdvisory = line.is_advisory;

      ensureSpace(16);
      doc.setFontSize(9);
      doc.setFont('helvetica', isHst ? 'bold' : 'normal');
      doc.setTextColor(isAdvisory ? 140 : isHst ? 50 : 80, isAdvisory ? 90 : isHst ? 50 : 80, isAdvisory ? 10 : isHst ? 50 : 80);

      doc.text(line.label, margin, y);
      const valStr = line.low === line.high
        ? fmt(line.low)
        : `${fmt(line.low)} – ${fmt(line.high)}`;
      doc.text(valStr, rightCol, y, { align: 'right' });
      br(14);
    }

    br(2);
    doc.setLineWidth(0.75);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageW - margin, y);
    br(12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Total (incl. HST)', margin, y);
    const totalStr = data.estimateLow === data.estimateHigh
      ? fmt(data.estimateLow)
      : `${fmt(data.estimateLow)} – ${fmt(data.estimateHigh)}`;
    doc.text(totalStr, rightCol, y, { align: 'right' });
    br(16);
    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 220, 220);
  }

  // ── What's included ───────────────────────────────────────────
  const includesMap: Record<string, string[]> = {
    'Moving': [
      'Loading and unloading at both locations',
      'Truck rental and fuel (as quoted)',
      'Protective blankets and basic wrapping',
      'Licensed, insured movers',
    ],
    'Junk Removal': [
      'Labour for loading and removal',
      'Transport to HRM disposal facility',
      'Category-specific disposal fees as itemized',
      'Licensed, insured crew',
    ],
    'Light Demo': [
      'Demolition labour as scoped',
      'Debris removal and disposal',
      'Site clean-up at end of job',
      'Licensed, insured crew',
    ],
  };

  const serviceIncludes = includesMap[data.serviceLabel] ?? null;
  if (serviceIncludes) {
    br(4);
    ensureSpace(serviceIncludes.length * 14 + 40);
    doc.line(margin, y, pageW - margin, y);
    br(14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text("WHAT'S INCLUDED", margin, y);
    br(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    for (const item of serviceIncludes) {
      ensureSpace(14);
      doc.text(`\u2022  ${item}`, margin + 4, y);
      br(13);
    }
  }

  // ── Notes ─────────────────────────────────────────────────────
  if (data.notes) {
    br(8);
    ensureSpace(60);
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

  // ── Terms ─────────────────────────────────────────────────────
  br(20);
  ensureSpace(60);
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
    doc.text(`\u2022 ${t}`, margin, y);
    br(12);
  }

  const filename = `quote${data.quoteNumber ? `-${data.quoteNumber}` : ''}-${data.customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}
