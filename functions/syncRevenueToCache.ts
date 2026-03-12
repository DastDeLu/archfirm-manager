import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const WEBHOOK_SECRET = Deno.env.get('SYNC_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Accept webhook secret (entity automation) or authenticated user
    const authHeader = req.headers.get('x-webhook-secret');
    const isWebhook = WEBHOOK_SECRET && authHeader === WEBHOOK_SECRET;

    if (!isWebhook) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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
        type: 'in'
      });
    } else {
      await base44.asServiceRole.entities.BankCash.create({
        amount: revenueRecord.amount,
        date: revenueRecord.date || new Date().toISOString().split('T')[0],
        description: revenueRecord.description || 'Revenue',
        category: revenueRecord.tag || 'Other',
        type: 'deposit'
      });
    }

    return Response.json({ success: true, message: 'Cash flow updated with revenue' });
  } catch (error) {
    console.error('Error syncing revenue to cash:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});