import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { installment_id } = await req.json();

    if (!installment_id) {
      return Response.json({ error: 'installment_id required' }, { status: 400 });
    }

    // Get installment details
    const installments = await base44.entities.Installment.filter({ id: installment_id });
    const installment = installments[0];

    if (!installment) {
      return Response.json({ error: 'Installment not found' }, { status: 404 });
    }

    // Get associated fee
    const fees = await base44.entities.Fee.filter({ id: installment.fee_id });
    const fee = fees[0];

    if (!fee) {
      return Response.json({ error: 'Associated fee not found' }, { status: 404 });
    }

    // Update installment to paid
    await base44.asServiceRole.entities.Installment.update(installment_id, {
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0]
    });

    // Determine default revenue tag
    let defaultTag = 'Progettazione';
    try {
      const customTags = await base44.asServiceRole.entities.CustomTag.filter({ type: 'revenue' });
      if (customTags.length > 0) defaultTag = customTags[0].name;
    } catch {
      // fallback to Progettazione
    }

    // Create Revenue entry
    await base44.asServiceRole.entities.Revenue.create({
      amount: installment.amount,
      date: new Date().toISOString().split('T')[0],
      description: `Incasso rata ${installment.installment_number || ''} - ${fee.project_name || 'Progetto'}`,
      tag: defaultTag,
      project_id: fee.project_id || null,
      project_name: fee.project_name || null
    });

    // Create BankCash entry (assuming bank payment)
    if (installment.payment_method === 'bank') {
      await base44.asServiceRole.entities.BankCash.create({
        amount: installment.amount,
        date: new Date().toISOString().split('T')[0],
        description: `Incasso rata - ${fee.project_name || 'Progetto'}`,
        category: 'Incasso Cliente',
        type: 'deposit'
      });
    } else if (installment.payment_method === 'cash') {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: installment.amount,
        date: new Date().toISOString().split('T')[0],
        description: `Incasso rata - ${fee.project_name || 'Progetto'}`,
        category: 'Incasso Cliente',
        type: 'in'
      });
    }

    // Check if all installments are paid and update fee status
    const allInstallments = await base44.entities.Installment.filter({ fee_id: installment.fee_id });
    const allPaid = allInstallments.every(i => i.status === 'paid');
    
    if (allPaid) {
      await base44.asServiceRole.entities.Fee.update(installment.fee_id, {
        status: 'paid'
      });
    } else {
      const somePaid = allInstallments.some(i => i.status === 'paid');
      if (somePaid) {
        await base44.asServiceRole.entities.Fee.update(installment.fee_id, {
          status: 'partial'
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Pagamento elaborato con successo'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});