import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function stampOwnerExtra(ownerUserId) {
  return ownerUserId ? { owner_user_id: ownerUserId } : {};
}

// Entity automation handler: Fee update → crea Revenue quando passa a "Incassati".
// Invocata internamente dalla piattaforma Base44 (entity automation), nessun secret esterno richiesto.
Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);
  const { data: feeRecord, old_data } = await req.json();

  if (!feeRecord || !feeRecord.id) {
    return Response.json({ error: 'Fee data required' }, { status: 400 });
  }

  const statusChangedToCollected =
    old_data?.payment_status === 'Da incassare' &&
    feeRecord.payment_status === 'Incassati';

  if (!statusChangedToCollected) {
    return Response.json({ success: true, message: 'No status change to collected, no action needed' });
  }

  // If the Fee has installments, revenues are created per-installment by
  // processInstallmentPayment / syncInstallmentRevenuePair. Skip to avoid duplicates.
  const installments = await base44.asServiceRole.entities.Installment.filter({ fee_id: feeRecord.id });
  if (installments.length > 0) {
    return Response.json({
      success: true,
      message: 'Fee has installments — revenues are created per-installment, skipping',
    });
  }

  // If a revenue already exists for this fee, do not create a duplicate.
  const existingRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: feeRecord.id });
  if (existingRevenues.length > 0) {
    return Response.json({
      success: true,
      message: 'Fee already has linked revenues — skipping duplicate revenue creation',
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});