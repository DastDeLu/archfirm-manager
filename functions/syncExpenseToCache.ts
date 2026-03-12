import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const WEBHOOK_SECRET = Deno.env.get('SYNC_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const authHeader = req.headers.get('x-webhook-secret');
    const isWebhook = WEBHOOK_SECRET && authHeader === WEBHOOK_SECRET;

    if (!isWebhook) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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
        type: 'out'
      });
    } else {
      await base44.asServiceRole.entities.BankCash.create({
        amount: expenseRecord.amount,
        date: expenseRecord.date || new Date().toISOString().split('T')[0],
        description: expenseRecord.description || 'Expense',
        category: expenseRecord.tag || 'Other',
        type: 'withdrawal'
      });
    }

    return Response.json({ success: true, message: 'Cash flow updated with expense' });
  } catch (error) {
    console.error('Error syncing expense to cash:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});