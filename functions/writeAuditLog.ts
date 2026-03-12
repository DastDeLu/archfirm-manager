import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const VALID_ACTIONS = ['create', 'update', 'delete', 'export', 'import'];
const MAX_ENTITY_TYPE_LENGTH = 100;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_DETAILS_LENGTH = 5000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, entity_type, entity_id, details } = await req.json();

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action)) {
      return Response.json({ error: `action non valida. Valori accettati: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    // Validate entity_type
    if (!entity_type || typeof entity_type !== 'string' || entity_type.length > MAX_ENTITY_TYPE_LENGTH) {
      return Response.json({ error: 'entity_type non valido o troppo lungo' }, { status: 400 });
    }

    // Validate entity_id (optional)
    if (entity_id && (typeof entity_id !== 'string' || entity_id.length > MAX_ENTITY_ID_LENGTH)) {
      return Response.json({ error: 'entity_id non valido o troppo lungo' }, { status: 400 });
    }

    // Validate details size
    const detailsStr = details ? JSON.stringify(details) : '';
    if (detailsStr.length > MAX_DETAILS_LENGTH) {
      return Response.json({ error: 'details troppo grandi (max 5000 caratteri serializzati)' }, { status: 400 });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action,
      entity_type,
      entity_id: entity_id || '',
      details: detailsStr,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});