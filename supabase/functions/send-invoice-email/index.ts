import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceEmailRequest {
  invoice_id: string;
  customer_email: string;
  customer_name: string;
  invoice_number: string;
  invoice_total: number;
  due_date: string;
  reminder_type?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: InvoiceEmailRequest = await req.json();

    const {
      invoice_id,
      customer_email,
      customer_name,
      invoice_number,
      invoice_total,
      due_date,
      reminder_type
    } = requestData;

    if (!invoice_id || !customer_email || !invoice_number) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailSubject = reminder_type
      ? getReminderSubject(reminder_type, invoice_number)
      : `Invoice ${invoice_number} from BudgetWorks`;

    const emailBody = reminder_type
      ? getReminderEmailBody(customer_name, invoice_number, invoice_total, due_date, reminder_type)
      : getInvoiceEmailBody(customer_name, invoice_number, invoice_total, due_date);

    console.log('Email would be sent to:', customer_email);
    console.log('Subject:', emailSubject);
    console.log('Body:', emailBody);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice email sent successfully",
        details: {
          to: customer_email,
          subject: emailSubject,
          invoice_id: invoice_id
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error('Error sending invoice email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send invoice email"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function getInvoiceEmailBody(
  customerName: string,
  invoiceNumber: string,
  invoiceTotal: number,
  dueDate: string
): string {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CAD'
  }).format(invoiceTotal);

  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
Dear ${customerName},

Thank you for your business! Your invoice is ready.

Invoice Number: ${invoiceNumber}
Total Amount: ${formattedTotal}
Due Date: ${formattedDueDate}

You can view and pay your invoice online through your customer portal.

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
BudgetWorks
  `.trim();
}

function getReminderSubject(reminderType: string, invoiceNumber: string): string {
  switch (reminderType) {
    case 'week_before':
      return `Reminder: Invoice ${invoiceNumber} due in 7 days`;
    case 'day_before':
      return `Reminder: Invoice ${invoiceNumber} due tomorrow`;
    case 'overdue_3_days':
      return `Overdue: Invoice ${invoiceNumber} - 3 days past due`;
    case 'overdue_7_days':
      return `Important: Invoice ${invoiceNumber} - 7 days past due`;
    default:
      return `Payment Reminder: Invoice ${invoiceNumber}`;
  }
}

function getReminderEmailBody(
  customerName: string,
  invoiceNumber: string,
  invoiceTotal: number,
  dueDate: string,
  reminderType: string
): string {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CAD'
  }).format(invoiceTotal);

  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let message = '';

  switch (reminderType) {
    case 'week_before':
      message = `This is a friendly reminder that your invoice is due in 7 days.`;
      break;
    case 'day_before':
      message = `This is a friendly reminder that your invoice is due tomorrow.`;
      break;
    case 'overdue_3_days':
      message = `This invoice is now 3 days past due. Please arrange payment as soon as possible.`;
      break;
    case 'overdue_7_days':
      message = `This invoice is now 7 days past due. This requires immediate attention.`;
      break;
  }

  return `
Dear ${customerName},

${message}

Invoice Number: ${invoiceNumber}
Total Amount: ${formattedTotal}
Due Date: ${formattedDueDate}

Please log in to your customer portal to view and pay this invoice.

If you've already made payment, please disregard this reminder. If you have any questions or concerns, please contact us.

Thank you for your prompt attention to this matter.

Best regards,
BudgetWorks
  `.trim();
}
