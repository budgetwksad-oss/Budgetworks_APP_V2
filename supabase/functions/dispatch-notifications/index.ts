import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_MAP: Record<string, string> = {
  email: "BudgetWorks <notifications@budgetworks.ca>",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pending, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .eq("channel", "email")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;
    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, dispatched: 0, message: "No pending notifications" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let dispatched = 0;
    let failed = 0;

    for (const item of pending) {
      if (!item.to_email || !item.rendered_subject || !item.rendered_body) {
        const errMsg = "Missing to_email, subject, or body";
        await supabase
          .from("notification_queue")
          .update({ status: "failed", error: errMsg, attempts: (item.attempts || 0) + 1 })
          .eq("id", item.id);

        await supabase
          .from("notification_log")
          .update({ status: "failed", error_message: errMsg })
          .eq("queue_id", item.id);

        failed++;
        continue;
      }

      const html = plaintextToHtml(item.rendered_body, item.rendered_subject);

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_MAP.email,
          to: [item.to_email],
          subject: item.rendered_subject,
          html,
        }),
      });

      const resendData = await resendRes.json();
      const attempts = (item.attempts || 0) + 1;

      if (resendRes.ok) {
        const sentAt = new Date().toISOString();

        await supabase
          .from("notification_queue")
          .update({ status: "sent", sent_at: sentAt, attempts, error: null })
          .eq("id", item.id);

        await supabase
          .from("notification_log")
          .update({ status: "sent", sent_at: sentAt, rendered_subject: item.rendered_subject, rendered_body: item.rendered_body })
          .eq("queue_id", item.id);

        dispatched++;
      } else {
        const errMsg = resendData.message || "Resend API error";
        const finalStatus = attempts >= 3 ? "failed" : "pending";

        await supabase
          .from("notification_queue")
          .update({ status: finalStatus, error: errMsg, attempts })
          .eq("id", item.id);

        if (finalStatus === "failed") {
          await supabase
            .from("notification_log")
            .update({ status: "failed", error_message: errMsg })
            .eq("queue_id", item.id);
        }

        failed++;
        console.error(`Failed to send notification ${item.id} (attempt ${attempts}):`, resendData);
      }
    }

    return new Response(
      JSON.stringify({ success: true, dispatched, failed, total: pending.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Dispatch error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Dispatch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function plaintextToHtml(body: string, subject: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const paragraphs = escaped
    .split(/\n\n+/)
    .map(p => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${subject}</title>
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
            ${paragraphs}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
              <tr>
                <td style="color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                  BudgetWorks &mdash; Halifax, Nova Scotia<br/>
                  Questions? Reply to this email or call us at (844) 404-1240.
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
