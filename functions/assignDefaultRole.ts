import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Webhook secret must match ASSIGN_ROLE_WEBHOOK_SECRET env variable
const WEBHOOK_SECRET = Deno.env.get('ASSIGN_ROLE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    // Verify webhook origin with shared secret
    const authHeader = req.headers.get('x-webhook-secret');
    if (!WEBHOOK_SECRET || authHeader !== WEBHOOK_SECRET) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Only process 'create' events from the User entity
    const eventType = payload?.event?.type;
    if (eventType && eventType !== 'create') {
      return Response.json({ success: true, message: 'Not a create event, skipped' });
    }

    const userId = payload?.event?.entity_id || payload?.data?.id;
    if (!userId || typeof userId !== 'string' || userId.length < 4) {
      return Response.json({ error: 'Missing or invalid user id' }, { status: 400 });
    }

    // Default role for all new users is 'Cliente'.
    // Owner promotion is handled manually via AdminDashboard — never via email comparison in code.
    const role = 'Cliente';

    await base44.asServiceRole.entities.User.update(userId, { role });

    return Response.json({ success: true, role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});