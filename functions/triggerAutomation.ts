import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const WEBHOOK_SECRET = Deno.env.get('AUTOMATION_WEBHOOK_SECRET');

const VALID_ENTITY_TYPES = ['Revenue', 'Expense', 'Project', 'Client', 'Fee', 'Installment', 'Quote', 'WBS', 'Forecast', 'MarketingBudget'];
const VALID_EVENT_TYPES = ['create', 'update', 'delete'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Accept either webhook secret (internal platform calls) or authenticated user
    const authHeader = req.headers.get('x-webhook-secret');
    const isWebhook = WEBHOOK_SECRET && authHeader === WEBHOOK_SECRET;

    if (!isWebhook) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { event, data, old_data } = await req.json();

    // Validate required fields
    if (!event?.entity_name || !event?.type || !event?.entity_id) {
      return Response.json({ error: 'Invalid event payload' }, { status: 400 });
    }
    if (!VALID_ENTITY_TYPES.includes(event.entity_name)) {
      return Response.json({ error: 'Invalid entity_name' }, { status: 400 });
    }
    if (!VALID_EVENT_TYPES.includes(event.type)) {
      return Response.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const result = await base44.asServiceRole.functions.invoke('evaluateAutomationRules', {
      entityType: event.entity_name,
      entityId: event.entity_id,
      eventType: event.type,
      data: data,
      oldData: old_data
    });

    return Response.json({ success: true, result: result.data });
  } catch (error) {
    console.error('Error triggering automation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});