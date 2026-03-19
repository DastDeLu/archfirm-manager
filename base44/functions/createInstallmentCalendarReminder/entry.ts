import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * HOW TO USE:
 * Enable the "googlecalendar" connector in Base44 Dashboard:
 * 1. Go to Dashboard -> Integrations -> App Connectors
 * 2. Authorize Google Calendar with required scopes
 * 3. This function will automatically use the OAuth token
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse payload
    const { installment, fee } = await req.json();

    if (!installment || !fee) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields: installment and fee' 
      }, { status: 400 });
    }

    // Get Google Calendar access token via Base44 Connectors
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Construct Calendar Event
    const eventPayload = {
      summary: `Payment Due: ${fee.client_name} - ${fee.project_name} (€${installment.amount.toLocaleString('it-IT')})`,
      description: `Installment #${installment.installment_number}\nAmount: €${installment.amount.toLocaleString('it-IT')}\nFee ID: ${fee.id}`,
      start: {
        date: installment.due_date, // All-day event (YYYY-MM-DD format)
      },
      end: {
        date: installment.due_date,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
        ],
      },
    };

    // Call Google Calendar API
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Calendar API error:', error);
      return Response.json({ 
        success: false, 
        error: `Calendar API error: ${response.status}` 
      }, { status: 500 });
    }

    const event = await response.json();

    return Response.json({ 
      success: true, 
      eventId: event.id,
      eventLink: event.htmlLink 
    });

  } catch (error) {
    console.error('Error creating calendar reminder:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});