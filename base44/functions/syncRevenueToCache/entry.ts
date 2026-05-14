import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Internal webhook: Revenue create -> aggiorna BankCash/PettyCash.
// Verifica del secret opzionale (legacy mode) se SYNC_WEBHOOK_SECRET non è configurato.
function verifyWebhookSecret(req) {
  const expected = Deno.env.get('SYNC_WEBHOOK_SECRET');
  if (!expected) return true; // legacy mode: nessun secret configurato
  const header = req.headers.get('x-webhook-secret') || req.headers.get('X-Webhook-Secret');
  return header === expected;
}

function stampOwnerExtra(ownerUserId) {
  return ownerUserId ? { owner_user_id: ownerUserId } : {};
}

Deno.serve(async (req) => {
  try {
    if (!verifyWebhookSecret(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const event = body?.event || {};
    const revenueRecord = body?.data;

    if (!revenueRecord || !revenueRecord.id) {
      return Response.json({ error: 'Revenue data required' }, { status: 400 });
    }

    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event, no action needed' });
    }

    const paymentMethod = revenueRecord.payment_method || 'bank_transfer';
    const today = new Date().toISOString().split('T')[0];

    if (paymentMethod === 'cash') {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: revenueRecord.amount,
        date: revenueRecord.date || today,
        description: revenueRecord.description || 'Revenue',
        category: revenueRecord.tag || 'Other',
        type: 'in',
        ...stampOwnerExtra(revenueRecord.owner_user_id),
      });
    } else {
      await base44.asServiceRole.entities.BankCash.create({
        amount: revenueRecord.amount,
        date: revenueRecord.date || today,
        description: revenueRecord.description || 'Revenue',
        category: revenueRecord.tag || 'Other',
        type: 'deposit',
        ...stampOwnerExtra(revenueRecord.owner_user_id),
      });
    }

    return Response.json({ success: true, message: 'Cash flow updated with revenue' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});