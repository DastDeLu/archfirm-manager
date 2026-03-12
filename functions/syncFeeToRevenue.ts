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

    const { event, data: feeRecord, old_data } = await req.json();

    if (!feeRecord || !feeRecord.id) {
      return Response.json({ error: 'Fee data required' }, { status: 400 });
    }

    const statusChangedToCollected =
      old_data?.payment_status === 'Da incassare' &&
      feeRecord.payment_status === 'Incassati';

    if (!statusChangedToCollected) {
      return Response.json({ success: true, message: 'No status change to collected, no action needed' });
    }

    const revenueData = {
      amount: feeRecord.amount,
      date: feeRecord.date || new Date().toISOString().split('T')[0],
      description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
      tag: feeRecord.category === 'Provvigioni' ? 'Provvigione' :
           feeRecord.category === 'Direzione Lavori' ? 'Direzione Lavori' :
           feeRecord.category === 'Pratiche Burocratiche' ? 'Burocrazia' : 'Progettazione',
      payment_method: feeRecord.payment_method === 'Banca' ? 'bank_transfer' : 'cash'
    };

    await base44.asServiceRole.entities.Revenue.create(revenueData);

    if (feeRecord.payment_method === 'Banca') {
      await base44.asServiceRole.entities.BankCash.create({
        amount: feeRecord.amount,
        date: feeRecord.date || new Date().toISOString().split('T')[0],
        description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
        category: feeRecord.category,
        type: 'deposit'
      });
    } else if (feeRecord.payment_method === 'Contanti') {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: feeRecord.amount,
        date: feeRecord.date || new Date().toISOString().split('T')[0],
        description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
        category: feeRecord.category,
        type: 'in'
      });
    }

    return Response.json({ success: true, message: 'Revenue created and cash flow updated', revenue: revenueData });
  } catch (error) {
    console.error('Error syncing fee to revenue:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});