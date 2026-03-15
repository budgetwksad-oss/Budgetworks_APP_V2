import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  type: 'job_scheduled' | 'job_completed' | 'quote_sent' | 'quote_accepted' | 'crew_assigned' | 'job_reminder';
  recipient_email: string;
  recipient_name: string;
  data: {
    job_id?: string;
    quote_id?: string;
    job_type?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    location?: string;
    quote_number?: string;
    quote_amount?: number;
    crew_names?: string[];
  };
}

const FROM_ADDRESS = "BudgetWorks <notifications@budgetworks.ca>";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: NotificationRequest = await req.json();
    const { type, recipient_email, recipient_name, data } = body;

    if (!type || !recipient_email || !recipient_name) {
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

    const subject = getEmailSubject(type, data);
    const html = getEmailHtml(type, recipient_name, data);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient_email],
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
      JSON.stringify({ success: true, message: "Notification sent", details: { to: recipient_email, type, subject } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatCAD(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
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
        <tr>
          <td style="background:#1a1a1a;padding:28px 40px;border-radius:8px 8px 0 0;">
            <span style="color:#f97316;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Budget</span><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Works</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:40px;border-radius:0 0 8px 8px;">
            ${content}
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

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:14px;width:40%;border-top:1px solid #e5e7eb;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e5e7eb;">${value}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:24px;">${rows}</table>`;
}

function getEmailSubject(type: string, data: any): string {
  const jobType = data.job_type || "service";
  switch (type) {
    case "job_scheduled": return `Your ${jobType} job has been scheduled`;
    case "job_completed": return `Your ${jobType} job is complete`;
    case "quote_sent": return `Your quote ${data.quote_number || ""} is ready`;
    case "quote_accepted": return `Quote ${data.quote_number || ""} accepted — job being scheduled`;
    case "crew_assigned": return `Crew assigned to your upcoming job`;
    case "job_reminder": return `Reminder: Your ${jobType} job is tomorrow`;
    default: return "Update from BudgetWorks";
  }
}

function getEmailHtml(type: string, recipientName: string, data: any): string {
  const jobType = (data.job_type || "service").replace("_", " ");

  switch (type) {
    case "job_scheduled": {
      const rows = [
        data.scheduled_date ? detailRow("Date", formatDate(data.scheduled_date)) : "",
        data.scheduled_time ? detailRow("Time", formatTime(data.scheduled_time)) : "",
        data.location ? detailRow("Location", data.location) : "",
      ].filter(Boolean).join("");

      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Job Scheduled</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Great news! Your <strong>${jobType}</strong> job has been scheduled.
        </p>
        ${rows ? detailTable(rows) : ""}
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          You can view full details and track progress in your customer portal.
        </p>`);
    }

    case "job_completed": {
      const rows = [
        data.location ? detailRow("Location", data.location) : "",
      ].filter(Boolean).join("");

      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Job Complete</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Your <strong>${jobType}</strong> job has been completed!
        </p>
        ${rows ? detailTable(rows) : ""}
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
          Please log in to your customer portal to:
        </p>
        <ul style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
          <li>View before and after photos</li>
          <li>Leave feedback about your experience</li>
          <li>Access your invoice</li>
        </ul>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Thank you for choosing BudgetWorks!
        </p>`);
    }

    case "quote_sent": {
      const rows = [
        data.quote_number ? detailRow("Quote Number", data.quote_number) : "",
        data.quote_amount ? detailRow("Estimated Amount (CAD)", formatCAD(data.quote_amount)) : "",
      ].filter(Boolean).join("");

      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Your Quote is Ready</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          We've prepared a quote for your <strong>${jobType}</strong> service. Please review and accept it through your customer portal.
        </p>
        ${rows ? detailTable(rows) : ""}
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Once accepted, we'll contact you to schedule your service. If you have any questions, don't hesitate to reach out.
        </p>`);
    }

    case "quote_accepted": {
      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Quote Accepted</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Thank you for accepting${data.quote_number ? ` quote <strong>${data.quote_number}</strong>` : " your quote"}! Our team will be in touch shortly to confirm your service details and schedule.
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          You can track the status of your job anytime in your customer portal.
        </p>`);
    }

    case "crew_assigned": {
      const crewList = data.crew_names?.length > 0 ? data.crew_names.join(", ") : "our professional team";
      const rows = [
        detailRow("Crew", crewList),
        data.scheduled_date ? detailRow("Date", formatDate(data.scheduled_date)) : "",
        data.scheduled_time ? detailRow("Time", formatTime(data.scheduled_time)) : "",
        data.location ? detailRow("Location", data.location) : "",
      ].filter(Boolean).join("");

      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Crew Assigned</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          A crew has been assigned to your upcoming job.
        </p>
        ${detailTable(rows)}
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Our crew will arrive prepared and ready to deliver excellent service.
        </p>`);
    }

    case "job_reminder": {
      const rows = [
        data.scheduled_date ? detailRow("Date", formatDate(data.scheduled_date)) : "",
        data.scheduled_time ? detailRow("Time", formatTime(data.scheduled_time)) : "",
        data.location ? detailRow("Location", data.location) : "",
      ].filter(Boolean).join("");

      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Job Reminder</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
          This is a friendly reminder that your <strong>${jobType}</strong> job is scheduled for tomorrow.
        </p>
        ${rows ? detailTable(rows) : ""}
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Please ensure someone is available to provide access if needed. If you need to reschedule, contact us as soon as possible.
        </p>`);
    }

    default:
      return emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:24px;color:#111827;">Update from BudgetWorks</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${recipientName},</p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Please log in to your customer portal for the latest updates on your service.
        </p>`);
  }
}
