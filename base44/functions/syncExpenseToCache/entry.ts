import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireWebhookSecret, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

// Internal webhook: Expense create. WEBHOOK_SECRET optional until configured (legacy mode).
Deno.serve(withAuth(async (req) => {
  requireWebhookSecret(req);

  const base44 = createClientFromRequest(req);
  const { event, data: expenseRecord } = await req.json();

  if (!expenseRecord || !expenseRecord.id) {
    return Response.json({ error: 'Expense data required' }, { status: 400 });
  }

  if (event.type !== 'create' || expenseRecord.stato !== 'Pagato') {
    return Response.json({ success: true, message: 'Not a paid expense creation, no action needed' });
  }

  const paymentMethod = expenseRecord.payment_method || 'bank_transfer';

  if (paymentMethod === 'cash') {
    await base44.asServiceRole.entities.PettyCash.create({
      amount: expenseRecord.amount,
      date: expenseRecord.date || new Date().toISOString().split('T')[0],
      description: expenseRecord.description || 'Expense',
      category: expenseRecord.tag || 'Other',
      type: 'out',
      ...stampOwnerExtra(expenseRecord.owner_user_id),
    });
  } else {
    await base44.asServiceRole.entities.BankCash.create({
      amount: expenseRecord.amount,
      date: expenseRecord.date || new Date().toISOString().split('T')[0],
      description: expenseRecord.description || 'Expense',
      category: expenseRecord.tag || 'Other',
      type: 'withdrawal',
      ...stampOwnerExtra(expenseRecord.owner_user_id),
    });
  }

  return Response.json({ success: true, message: 'Cash flow updated with expense' });
}));
