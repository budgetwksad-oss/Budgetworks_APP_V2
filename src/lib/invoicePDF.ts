import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoice_number: string;
  created_at: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  customer_address?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  status: string;
  hours_worked?: number;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'BudgetWorks',
  address: 'Halifax, Nova Scotia',
  phone: '(844) 404-1240',
  email: 'info@budgetworks.ca'
};

export function generateInvoicePDF(invoice: InvoiceData, companyInfo: CompanyInfo = DEFAULT_COMPANY_INFO) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, yPosition);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(companyInfo.name, pageWidth - 20, yPosition, { align: 'right' });
  yPosition += 5;
  doc.text(companyInfo.address, pageWidth - 20, yPosition, { align: 'right' });
  yPosition += 5;
  doc.text(companyInfo.phone, pageWidth - 20, yPosition, { align: 'right' });
  yPosition += 5;
  doc.text(companyInfo.email, pageWidth - 20, yPosition, { align: 'right' });

  yPosition = 50;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, yPosition);

  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.customer_name, 20, yPosition);
  yPosition += 5;
  doc.text(invoice.customer_email, 20, yPosition);
  if (invoice.customer_address) {
    yPosition += 5;
    doc.text(invoice.customer_address, 20, yPosition);
  }

  yPosition = 50;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', pageWidth - 80, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, pageWidth - 20, yPosition, { align: 'right' });

  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', pageWidth - 80, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.created_at).toLocaleDateString(), pageWidth - 20, yPosition, { align: 'right' });

  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', pageWidth - 80, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.due_date).toLocaleDateString(), pageWidth - 20, yPosition, { align: 'right' });

  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', pageWidth - 80, yPosition);
  doc.setFont('helvetica', 'normal');
  const statusColor = getStatusColor(invoice.status);
  doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
  doc.text(invoice.status.toUpperCase(), pageWidth - 20, yPosition, { align: 'right' });
  doc.setTextColor(0);

  yPosition = Math.max(yPosition + 15, 90);

  const tableData = invoice.line_items.map(item => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 40;
  yPosition = finalY + 10;

  const rightX = pageWidth - 20;
  const labelX = rightX - 60;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (invoice.hours_worked && invoice.hours_worked > 0) {
    doc.setTextColor(100);
    doc.text(`Hours Worked: ${invoice.hours_worked.toFixed(2)} hrs`, labelX, yPosition);
    doc.setTextColor(0);
    yPosition += 6;
  }

  doc.text('Subtotal:', labelX, yPosition);
  doc.text(formatCurrency(invoice.subtotal), rightX, yPosition, { align: 'right' });

  yPosition += 6;
  doc.text('Tax (HST):', labelX, yPosition);
  doc.text(formatCurrency(invoice.tax_amount), rightX, yPosition, { align: 'right' });

  yPosition += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total (CAD):', labelX, yPosition);
  doc.text(formatCurrency(invoice.total), rightX, yPosition, { align: 'right' });

  if (invoice.notes) {
    yPosition += 15;
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPosition);
  }

  yPosition = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(invoice: InvoiceData, companyInfo?: CompanyInfo) {
  const doc = generateInvoicePDF(invoice, companyInfo);
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}

export function getInvoicePDFBlob(invoice: InvoiceData, companyInfo?: CompanyInfo): Blob {
  const doc = generateInvoicePDF(invoice, companyInfo);
  return doc.output('blob');
}

export function getInvoicePDFBase64(invoice: InvoiceData, companyInfo?: CompanyInfo): string {
  const doc = generateInvoicePDF(invoice, companyInfo);
  return doc.output('dataurlstring');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount);
}

function getStatusColor(status: string): { r: number; g: number; b: number } {
  const colors: Record<string, { r: number; g: number; b: number }> = {
    draft: { r: 100, g: 100, b: 100 },
    sent: { r: 41, g: 128, b: 185 },
    partial: { r: 234, g: 179, b: 8 },
    paid: { r: 39, g: 174, b: 96 },
    overdue: { r: 231, g: 76, b: 60 },
    closed: { r: 127, g: 140, b: 141 }
  };
  return colors[status] || { r: 0, g: 0, b: 0 };
}
