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

const FROM_ADDRESS = "BudgetWorks <invoices@budgetworks.ca>";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: InvoiceEmailRequest = await req.json();
    const { invoice_id, customer_email, customer_name, invoice_number, invoice_total, due_date, reminder_type } = body;

    if (!invoice_id || !customer_email || !invoice_number) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = reminder_type
      ? getReminderSubject(reminder_type, invoice_number)
      : `Invoice ${invoice_number} from BudgetWorks`;

    const html = reminder_type
      ? getReminderHtml(customer_name, invoice_number, invoice_total, due_date, reminder_type)
      : getInvoiceHtml(customer_name, invoice_number, invoice_total, due_date);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [customer_email],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ success: false, error: resendData.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invoice email sent", details: { to: customer_email, subject, invoice_id } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send invoice email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatCAD(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BudgetWorks</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:28px 40px;border-radius:8px 8px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#f97316;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Budget</span><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Works</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-radius:0 0 8px 8px;">
            ${content}
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;">
              <tr>
                <td style="color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                  BudgetWorks &mdash; Halifax, Nova Scotia<br/>
                  Questions? Reply to this email or visit your customer portal.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getInvoiceHtml(customerName: string, invoiceNumber: string, invoiceTotal: number, dueDate: string): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Invoice Ready</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${customerName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Thank you for your business! Your invoice is ready for review.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;width:50%;">Invoice Number</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Amount Due (CAD)</td>
        <td style="padding:8px 0;color:#111827;font-size:18px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${formatCAD(invoiceTotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Due Date</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${formatDate(dueDate)}</td>
      </tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Log in to your customer portal to view the full invoice details and payment options.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
      If you have any questions about this invoice, please don't hesitate to reach out.
    </p>`;
  return emailWrapper(content);
}

function getReminderSubject(reminderType: string, invoiceNumber: string): string {
  switch (reminderType) {
    case "week_before": return `Reminder: Invoice ${invoiceNumber} due in 7 days`;
    case "day_before": return `Reminder: Invoice ${invoiceNumber} due tomorrow`;
    case "overdue_3_days": return `Overdue: Invoice ${invoiceNumber} — 3 days past due`;
    case "overdue_7_days": return `Important: Invoice ${invoiceNumber} — 7 days past due`;
    default: return `Payment Reminder: Invoice ${invoiceNumber}`;
  }
}

function getReminderHtml(customerName: string, invoiceNumber: string, invoiceTotal: number, dueDate: string, reminderType: string): string {
  const messages: Record<string, { label: string; text: string; color: string }> = {
    week_before: { label: "Due in 7 Days", text: "This is a friendly reminder that your invoice is due in 7 days.", color: "#3b82f6" },
    day_before: { label: "Due Tomorrow", text: "This is a friendly reminder that your invoice is due tomorrow.", color: "#f59e0b" },
    overdue_3_days: { label: "3 Days Overdue", text: "Your invoice is now 3 days past due. Please arrange payment as soon as possible.", color: "#ef4444" },
    overdue_7_days: { label: "7 Days Overdue", text: "Your invoice is 7 days past due and requires immediate attention.", color: "#dc2626" },
  };

  const { label, text, color } = messages[reminderType] ?? { label: "Payment Reminder", text: "Please review your outstanding invoice.", color: "#6b7280" };

  const content = `
    <div style="display:inline-block;background:${color}20;color:${color};font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;margin-bottom:16px;letter-spacing:0.5px;text-transform:uppercase;">${label}</div>
    <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Payment Reminder</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${customerName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">${text}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;width:50%;">Invoice Number</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Amount (CAD)</td>
        <td style="padding:8px 0;color:${color};font-size:18px;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">${formatCAD(invoiceTotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Due Date</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${formatDate(dueDate)}</td>
      </tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Please log in to your customer portal to view and pay this invoice.
      If you've already made payment, please disregard this reminder.
    </p>`;
  return emailWrapper(content);
}
