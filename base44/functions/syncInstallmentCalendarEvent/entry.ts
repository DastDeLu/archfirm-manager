import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function getValidAccessToken(base44, userEmail) {
  const tokens = await base44.asServiceRole.entities.UserCalendarToken.filter({ user_email: userEmail });
  if (!tokens.length) return null;

  const token = tokens[0];
  const now = new Date();
  const expiry = token.token_expiry ? new Date(token.token_expiry) : null;

  // If token is still valid (with 2 min buffer), return it
  if (expiry && expiry.getTime() - now.getTime() > 120000) {
    return { accessToken: token.access_token, tokenRecord: token };
  }

  // Refresh using refresh_token
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) return null;

  const { access_token, expires_in } = await refreshRes.json();
  const newExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  await base44.asServiceRole.entities.UserCalendarToken.update(token.id, {
    access_token,
    token_expiry: newExpiry,
  });

  return { accessToken: access_token, tokenRecord: { ...token, access_token, token_expiry: newExpiry } };
}

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

    // Get token for current user
    const tokenData = await getValidAccessToken(base44, user.email);
    if (!tokenData) {
      return Response.json({ error: 'Google Calendar not connected for this user' }, { status: 400 });
    }
    const { accessToken } = tokenData;

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
        // Get existing event first
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