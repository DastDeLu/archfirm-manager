import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireWebhookSecret, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

// Internal webhook: Revenue create. WEBHOOK_SECRET is optional until configured (legacy mode).
Deno.serve(withAuth(async (req) => {
  requireWebhookSecret(req);

  const base44 = createClientFromRequest(req);
  const { event, data: revenueRecord } = await req.json();

  if (!revenueRecord || !revenueRecord.id) {
    return Response.json({ error: 'Revenue data required' }, { status: 400 });
  }

  if (event.type !== 'create') {
    return Response.json({ success: true, message: 'Not a create event, no action needed' });
  }

  const paymentMethod = revenueRecord.payment_method || 'bank_transfer';

  if (paymentMethod === 'cash') {
    await base44.asServiceRole.entities.PettyCash.create({
      amount: revenueRecord.amount,
      date: revenueRecord.date || new Date().toISOString().split('T')[0],
      description: revenueRecord.description || 'Revenue',
      category: revenueRecord.tag || 'Other',
      type: 'in',
      ...stampOwnerExtra(revenueRecord.owner_user_id),
    });
  } else {
    await base44.asServiceRole.entities.BankCash.create({
      amount: revenueRecord.amount,
      date: revenueRecord.date || new Date().toISOString().split('T')[0],
      description: revenueRecord.description || 'Revenue',
      category: revenueRecord.tag || 'Other',
      type: 'deposit',
      ...stampOwnerExtra(revenueRecord.owner_user_id),
    });
  }

  return Response.json({ success: true, message: 'Cash flow updated with revenue' });
}));
