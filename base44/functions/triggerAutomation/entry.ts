import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireWebhookSecret, withAuth } from '../_lib/authz.ts';
import { runEvaluateAutomationRules } from '../_lib/evaluateAutomationCore.ts';

// Calls automation logic in-process (no nested invoke) so it works with or without
// AUTOMATION_WEBHOOK_SECRET and without a user session on the inner request.
Deno.serve(withAuth(async (req) => {
  requireWebhookSecret(req, 'AUTOMATION_WEBHOOK_SECRET');

  const base44 = createClientFromRequest(req);
  const { event, data, old_data } = await req.json();

  const result = await runEvaluateAutomationRules(base44, {
    entityType: event.entity_name,
    entityId: event.entity_id,
    eventType: event.type,
    data,
    oldData: old_data,
  });

  return Response.json({ success: true, result });
}));
