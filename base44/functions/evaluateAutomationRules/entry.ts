import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, withAuth } from '../_lib/authz.ts';
import { runEvaluateAutomationRules } from '../_lib/evaluateAutomationCore.ts';

Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  await requireUser(base44);

  try {
    const { entityType, entityId, eventType, data, oldData } = await req.json();
    const result = await runEvaluateAutomationRules(base44, {
      entityType,
      entityId,
      eventType,
      data,
      oldData,
    });
    return Response.json(result);
  } catch (error) {
    console.error('Error evaluating automation rules:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}));
