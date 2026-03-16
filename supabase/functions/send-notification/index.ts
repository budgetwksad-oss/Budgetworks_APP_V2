import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  event_key: string;
  audience: string;
  channel: string;
  service_type?: string;
  to_email?: string;
  to_phone?: string;
  payload: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: NotificationRequest = await req.json();
    const { event_key, audience, channel, service_type, to_email, to_phone, payload } = body;

    if (!event_key || !audience || !channel) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: event_key, audience, channel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!to_email && !to_phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Either to_email or to_phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: queueId, error: enqueueError } = await supabase.rpc("enqueue_notification", {
      p_event_key: event_key,
      p_audience: audience,
      p_channel: channel,
      p_service_type: service_type || null,
      p_to_email: to_email || "",
      p_to_phone: to_phone || "",
      p_payload: payload,
    });

    if (enqueueError) {
      console.error("Enqueue error:", enqueueError);
      return new Response(
        JSON.stringify({ success: false, error: enqueueError.message || "Failed to enqueue notification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dispatchUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/dispatch-notifications`;
    const dispatchRes = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    const dispatchData = await dispatchRes.json().catch(() => ({}));

    if (!dispatchRes.ok) {
      console.error("Dispatch trigger error:", dispatchData);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification enqueued",
        queue_id: queueId,
        dispatched: dispatchData?.dispatched ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
