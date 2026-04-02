import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireWebhookSecret, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

// Internal webhook: Fee status → Revenue. WEBHOOK_SECRET optional until configured (legacy mode).
Deno.serve(withAuth(async (req) => {
  requireWebhookSecret(req);

  const base44 = createClientFromRequest(req);
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

  // If installment-linked revenues already exist, do not create a duplicate.
  const existingRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: feeRecord.id });
  if (existingRevenues.length > 0) {
    return Response.json({
      success: true,
      message: 'Fee already has linked revenues from installments — skipping duplicate revenue creation',
    });
  }

  const revenueData = {
    amount: feeRecord.amount,
    date: feeRecord.date || new Date().toISOString().split('T')[0],
    description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
    tag: feeRecord.category === 'Provvigioni' ? 'Provvigione'
       : feeRecord.category === 'Direzione Lavori' ? 'Direzione Lavori'
       : feeRecord.category === 'Pratiche Burocratiche' ? 'Burocrazia'
       : 'Progettazione',
    payment_method: feeRecord.payment_method === 'Banca' ? 'bank_transfer' : 'cash',
    fee_id: feeRecord.id,
    ...stampOwnerExtra(feeRecord.owner_user_id),
  };

  await base44.asServiceRole.entities.Revenue.create(revenueData);

  if (feeRecord.payment_method === 'Banca') {
    await base44.asServiceRole.entities.BankCash.create({
      amount: feeRecord.amount,
      date: feeRecord.date || new Date().toISOString().split('T')[0],
      description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
      category: feeRecord.category,
      type: 'deposit',
      ...stampOwnerExtra(feeRecord.owner_user_id),
    });
  } else if (feeRecord.payment_method === 'Contanti') {
    await base44.asServiceRole.entities.PettyCash.create({
      amount: feeRecord.amount,
      date: feeRecord.date || new Date().toISOString().split('T')[0],
      description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
      category: feeRecord.category,
      type: 'in',
      ...stampOwnerExtra(feeRecord.owner_user_id),
    });
  }

  return Response.json({ success: true, message: 'Revenue created and cash flow updated', revenue: revenueData });
}));
