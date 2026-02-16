export interface ReportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
}

export function exportToCSV(data: ReportData) {
  const { headers, rows, title } = data;

  const escapeCsvValue = (value: string | number): string => {
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function exportToPDF(data: ReportData, includeDate: boolean = true) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(data.title, 14, 22);

  if (includeDate) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);
  }

  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: includeDate ? 38 : 32,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 'auto' }
    },
    margin: { top: 40, left: 14, right: 14 }
  });

  doc.save(`${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function prepareJobsReport(jobs: any[]): ReportData {
  return {
    title: 'Jobs Report',
    headers: ['Job ID', 'Service Type', 'Customer', 'Status', 'Scheduled Date', 'Location', 'Total Amount'],
    rows: jobs.map(job => [
      job.id.substring(0, 8),
      job.service_type.replace('_', ' '),
      job.customer_name || 'N/A',
      job.status,
      job.scheduled_date || 'N/A',
      job.location || 'N/A',
      `$${job.total_amount?.toFixed(2) || '0.00'}`
    ])
  };
}

export function prepareInvoicesReport(invoices: any[]): ReportData {
  return {
    title: 'Invoices Report',
    headers: ['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Status', 'Total', 'Balance Due'],
    rows: invoices.map(inv => [
      inv.invoice_number,
      inv.customer_name || 'N/A',
      new Date(inv.issue_date).toLocaleDateString(),
      new Date(inv.due_date).toLocaleDateString(),
      inv.status,
      `$${inv.total?.toFixed(2) || '0.00'}`,
      `$${inv.balance_due?.toFixed(2) || '0.00'}`
    ])
  };
}

export function prepareCustomersReport(customers: any[]): ReportData {
  return {
    title: 'Customers Report',
    headers: ['Name', 'Email', 'Phone', 'Total Jobs', 'Total Spent', 'Join Date'],
    rows: customers.map(customer => [
      customer.full_name,
      customer.email,
      customer.phone || 'N/A',
      customer.total_jobs || 0,
      `$${customer.total_spent?.toFixed(2) || '0.00'}`,
      new Date(customer.created_at).toLocaleDateString()
    ])
  };
}

export function prepareRevenueReport(revenueData: any[]): ReportData {
  return {
    title: 'Revenue Report',
    headers: ['Month', 'Revenue', 'Invoice Count', 'Average Invoice'],
    rows: revenueData.map(item => [
      item.month,
      `$${item.revenue.toFixed(2)}`,
      item.invoiceCount,
      `$${item.invoiceCount > 0 ? (item.revenue / item.invoiceCount).toFixed(2) : '0.00'}`
    ])
  };
}

export function prepareCrewPerformanceReport(crewData: any[]): ReportData {
  return {
    title: 'Crew Performance Report',
    headers: ['Crew Member', 'Total Jobs', 'Completed Jobs', 'Hours Worked', 'Average Rating'],
    rows: crewData.map(crew => [
      crew.full_name,
      crew.total_jobs || 0,
      crew.completed_jobs || 0,
      crew.hours_worked?.toFixed(1) || '0.0',
      crew.average_rating ? crew.average_rating.toFixed(1) : 'N/A'
    ])
  };
}
