import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireUser, withAuth } from '../_lib/authz.ts';

Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  await requireUser(base44);

  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    if (!accessToken) {
      return Response.json({ connected: false });
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return Response.json({ connected: res.ok });
  } catch {
    return Response.json({ connected: false });
  }
}));
