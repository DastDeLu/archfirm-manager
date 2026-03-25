import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    
    if (!accessToken) {
      return Response.json({ connected: false });
    }

    // Quick test call to verify token works
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return Response.json({ connected: res.ok });
  } catch (error) {
    return Response.json({ connected: false });
  }
});