import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: feeRecord, old_data } = await req.json();

    if (!feeRecord || !feeRecord.id) {
      return Response.json({ error: 'Fee data required' }, { status: 400 });
    }

    // Only process if status changed FROM "Da incassare" TO "Incassati"
    const statusChangedToCollected =
      old_data?.payment_status === 'Da incassare' &&
      feeRecord.payment_status === 'Incassati';

    if (!statusChangedToCollected) {
      return Response.json({
        success: true,
        message: 'No status change to collected, no action needed'
      });
    }

    // Check if this fee already has revenues linked via installments.
    // If so, the installment payment flow already created the Revenue records —
    // we must NOT create a duplicate for the full fee amount.
    const existingRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: feeRecord.id });
    if (existingRevenues.length > 0) {
      return Response.json({
        success: true,
        message: 'Fee already has linked revenues from installments — skipping duplicate revenue creation'
      });
    }

    // No installment-linked revenues exist: this fee was collected directly
    // (e.g. via the old direct-payment flow), so create the Revenue entry now.
    const revenueData = {
      amount: feeRecord.amount,
      date: feeRecord.date || new Date().toISOString().split('T')[0],
      description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
      tag: feeRecord.category === 'Provvigioni' ? 'Provvigione' :
           feeRecord.category === 'Direzione Lavori' ? 'Direzione Lavori' :
           feeRecord.category === 'Pratiche Burocratiche' ? 'Burocrazia' : 'Progettazione',
      payment_method: feeRecord.payment_method === 'Banca' ? 'bank_transfer' : 'cash',
      fee_id: feeRecord.id
    };

    await base44.asServiceRole.entities.Revenue.create(revenueData);

    // Add to cash flow based on payment method
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

    return Response.json({
      success: true,
      message: 'Revenue created and cash flow updated',
      revenue: revenueData
    });

  } catch (error) {
    console.error('Error syncing fee to revenue:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});