import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, assertOwned, withAuth } from '../_lib/authz.ts';

/**
 * HOW TO USE:
 * Enable the "googlecalendar" connector in Base44 Dashboard:
 * 1. Go to Dashboard -> Integrations -> App Connectors
 * 2. Authorize Google Calendar with required scopes
 * 3. This function will automatically use the OAuth token
 *
 * Security: installment and fee are reloaded from the database (not trusted from the
 * request body) to prevent a caller from injecting arbitrary text into calendar events
 * or accessing data belonging to another user.
 */
Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);

  const { installment_id, fee_id } = await req.json();

  if (!installment_id || !fee_id) {
    return Response.json({ success: false, error: 'Missing required fields: installment_id and fee_id' }, { status: 400 });
  }

  // Reload both records from the database — do NOT trust client-supplied objects.
  const installments = await base44.entities.Installment.filter({ id: installment_id });
  const installment = installments[0];
  if (!installment) {
    return Response.json({ success: false, error: 'Installment not found' }, { status: 404 });
  }
  assertOwned(installment, user.id);

  const fees = await base44.entities.Fee.filter({ id: fee_id });
  const fee = fees[0];
  if (!fee) {
    return Response.json({ success: false, error: 'Fee not found' }, { status: 404 });
  }
  assertOwned(fee, user.id);

  const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

  const eventPayload = {
    summary: `Payment Due: ${fee.client_name} - ${fee.project_name} (€${installment.amount.toLocaleString('it-IT')})`,
    description: `Installment #${installment.installment_number}\nAmount: €${installment.amount.toLocaleString('it-IT')}\nFee ID: ${fee.id}`,
    start: { date: installment.due_date },
    end: { date: installment.due_date },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 24 * 60 }],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar API error:', error);
    return Response.json({ success: false, error: `Calendar API error: ${response.status}` }, { status: 500 });
  }

  const event = await response.json();
  return Response.json({ success: true, eventId: event.id, eventLink: event.htmlLink });
}));
