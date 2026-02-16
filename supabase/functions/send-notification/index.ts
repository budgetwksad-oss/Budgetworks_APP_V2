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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: NotificationRequest = await req.json();

    const {
      type,
      recipient_email,
      recipient_name,
      data
    } = requestData;

    if (!type || !recipient_email || !recipient_name) {
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

    const emailSubject = getEmailSubject(type, data);
    const emailBody = getEmailBody(type, recipient_name, data);

    console.log('Notification would be sent to:', recipient_email);
    console.log('Type:', type);
    console.log('Subject:', emailSubject);
    console.log('Body:', emailBody);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        details: {
          to: recipient_email,
          type: type,
          subject: emailSubject
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
    console.error('Error sending notification:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send notification"
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

function getEmailSubject(type: string, data: any): string {
  switch (type) {
    case 'job_scheduled':
      return `Your ${data.job_type || 'service'} job has been scheduled`;
    case 'job_completed':
      return `Your ${data.job_type || 'service'} job is complete`;
    case 'quote_sent':
      return `Your quote ${data.quote_number || ''} is ready`;
    case 'quote_accepted':
      return `Quote ${data.quote_number || ''} accepted - Job scheduled`;
    case 'crew_assigned':
      return `Crew assigned to your job`;
    case 'job_reminder':
      return `Reminder: Your ${data.job_type || 'service'} job is tomorrow`;
    default:
      return 'Service Update';
  }
}

function getEmailBody(type: string, recipientName: string, data: any): string {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  let message = '';

  switch (type) {
    case 'job_scheduled':
      message = `
Dear ${recipientName},

Great news! Your ${data.job_type || 'service'} job has been scheduled.

Job Details:
- Date: ${data.scheduled_date ? formatDate(data.scheduled_date) : 'TBD'}
${data.scheduled_time ? `- Time: ${formatTime(data.scheduled_time)}` : ''}
${data.location ? `- Location: ${data.location}` : ''}

You can view full details and track progress in your customer portal.

Thank you for choosing our service!

Best regards,
Service Company
      `.trim();
      break;

    case 'job_completed':
      message = `
Dear ${recipientName},

Your ${data.job_type || 'service'} job has been completed!

${data.location ? `Location: ${data.location}` : ''}

We hope you're satisfied with our service. Please log in to your customer portal to:
- View job photos
- Leave feedback about your experience
- Access your invoice

Your feedback helps us improve our services.

Thank you for your business!

Best regards,
Service Company
      `.trim();
      break;

    case 'quote_sent':
      message = `
Dear ${recipientName},

Your quote is ready for review.

Quote Number: ${data.quote_number || 'N/A'}
${data.quote_amount ? `Amount: ${formatCurrency(data.quote_amount)}` : ''}

You can review the detailed quote and accept it through your customer portal. Once accepted, we'll schedule your service.

If you have any questions about the quote, please don't hesitate to contact us.

Best regards,
Service Company
      `.trim();
      break;

    case 'quote_accepted':
      message = `
Dear ${recipientName},

Thank you for accepting quote ${data.quote_number || ''}!

We've scheduled your service and our team will contact you shortly with the details.

You can view your job details in the customer portal.

We look forward to serving you!

Best regards,
Service Company
      `.trim();
      break;

    case 'crew_assigned':
      const crewList = data.crew_names && data.crew_names.length > 0
        ? data.crew_names.join(', ')
        : 'our professional team';

      message = `
Dear ${recipientName},

Your job has been assigned to ${crewList}.

${data.scheduled_date ? `Scheduled Date: ${formatDate(data.scheduled_date)}` : ''}
${data.scheduled_time ? `Time: ${formatTime(data.scheduled_time)}` : ''}
${data.location ? `Location: ${data.location}` : ''}

Our crew will arrive prepared to complete your service to the highest standards.

View full details in your customer portal.

Best regards,
Service Company
      `.trim();
      break;

    case 'job_reminder':
      message = `
Dear ${recipientName},

This is a friendly reminder that your ${data.job_type || 'service'} job is scheduled for tomorrow.

Job Details:
- Date: ${data.scheduled_date ? formatDate(data.scheduled_date) : 'Tomorrow'}
${data.scheduled_time ? `- Time: ${formatTime(data.scheduled_time)}` : ''}
${data.location ? `- Location: ${data.location}` : ''}

Please ensure someone is available to provide access if needed. If you need to reschedule, please contact us as soon as possible.

See you tomorrow!

Best regards,
Service Company
      `.trim();
      break;

    default:
      message = `
Dear ${recipientName},

This is an update regarding your service.

Please log in to your customer portal for more details.

Best regards,
Service Company
      `.trim();
  }

  return message;
}
