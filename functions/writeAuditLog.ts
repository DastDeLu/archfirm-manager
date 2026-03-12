import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, entity_type, entity_id, details } = await req.json();

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action,
      entity_type,
      entity_id: entity_id || '',
      details: details ? JSON.stringify(details) : '',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});