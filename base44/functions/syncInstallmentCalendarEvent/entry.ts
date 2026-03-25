import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { installment_id, action } = await req.json();
    // action: 'create' | 'update' | 'mark_paid' | 'delete'

    if (!installment_id || !action) {
      return Response.json({ error: 'installment_id and action required' }, { status: 400 });
    }

    // Get token via app connector (already authorized)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    // Fetch installment
    const installments = await base44.entities.Installment.filter({ id: installment_id });
    const installment = installments[0];
    if (!installment) {
      return Response.json({ error: 'Installment not found' }, { status: 404 });
    }

    // Fetch associated fee
    const fees = await base44.entities.Fee.filter({ id: installment.fee_id });
    const fee = fees[0];
    if (!fee) {
      return Response.json({ error: 'Fee not found' }, { status: 404 });
    }

    const calendarId = 'primary';
    const authHeader = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const kindLabel = installment.kind === 'acconto' ? 'Acconto' : installment.kind === 'saldo' ? 'Saldo' : `Rata #${installment.installment_number || ''}`;
    const title = `Scadenza ${kindLabel} – ${fee.client_name || 'Cliente'} – €${(installment.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
    const description = [
      `Progetto: ${fee.project_name || '—'}`,
      `Cliente: ${fee.client_name || '—'}`,
      `Categoria: ${fee.category || '—'}`,
      `Importo: €${(installment.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      `Tipo: ${kindLabel}`,
      installment.notes ? `Note: ${installment.notes}` : '',
    ].filter(Boolean).join('\n');

    const eventBody = {
      summary: title,
      description,
      start: { date: installment.due_date },
      end: { date: installment.due_date },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 },  // 1 day before
          { method: 'popup', minutes: 120 },   // 2 hours before
        ],
      },
    };

    let googleEventId = installment.google_event_id;
    let responseData = {};

    if (action === 'delete') {
      if (googleEventId) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`, {
          method: 'DELETE',
          headers: authHeader,
        });
        await base44.entities.Installment.update(installment_id, { google_event_id: null, calendar_sync_enabled: false });
      }
      return Response.json({ success: true });
    }

    if (action === 'mark_paid') {
      if (googleEventId) {
        const getRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (getRes.ok) {
          const existingEvent = await getRes.json();
          const updatedBody = {
            ...existingEvent,
            summary: `✅ PAGATO – ${existingEvent.summary || title}`,
            description: `PAGATO il ${new Date().toLocaleDateString('it-IT')}\n\n${existingEvent.description || description}`,
          };
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`, {
            method: 'PUT',
            headers: authHeader,
            body: JSON.stringify(updatedBody),
          });
        }
      }
      return Response.json({ success: true });
    }

    if (action === 'create' || !googleEventId) {
      const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(eventBody),
      });
      if (!createRes.ok) {
        const err = await createRes.text();
        return Response.json({ error: 'Calendar API error: ' + err }, { status: 500 });
      }
      const created = await createRes.json();
      googleEventId = created.id;
      await base44.entities.Installment.update(installment_id, {
        google_event_id: googleEventId,
        calendar_sync_enabled: true,
      });
      responseData = { google_event_id: googleEventId };
    } else if (action === 'update' && googleEventId) {
      const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(eventBody),
      });
      if (!updateRes.ok) {
        const err = await updateRes.text();
        return Response.json({ error: 'Calendar API error: ' + err }, { status: 500 });
      }
    }

    return Response.json({ success: true, ...responseData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});