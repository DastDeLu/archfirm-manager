import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();
    
    // Call the evaluation function
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