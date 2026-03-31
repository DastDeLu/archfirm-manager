import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      installment_id,
      payment_date,
      revenue_description,
      revenue_tag,
      payment_method,
      amount_override,
    } = body;

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

    // Resolve values with fallbacks
    const resolvedDate = payment_date || new Date().toISOString().split('T')[0];
    const resolvedAmount = amount_override && !isNaN(amount_override) ? amount_override : installment.amount;
    const resolvedDescription = revenue_description || `Incasso rata ${installment.installment_number || ''} - ${fee.project_name || fee.client_name || 'Progetto'}`;
    const resolvedPaymentMethod = payment_method || (installment.payment_method === 'cash' ? 'cash' : 'bank_transfer');

    // Resolve tag with fallback
    let resolvedTag = revenue_tag;
    if (!resolvedTag) {
      try {
        const customTags = await base44.asServiceRole.entities.CustomTag.filter({ type: 'revenue' });
        resolvedTag = customTags.length > 0 ? customTags[0].name : 'Progettazione';
      } catch {
        resolvedTag = 'Progettazione';
      }
    }

    // Update installment to paid
    await base44.asServiceRole.entities.Installment.update(installment_id, {
      status: 'paid',
      paid_date: resolvedDate,
    });

    // Create Revenue entry with user-chosen or fallback values
    await base44.asServiceRole.entities.Revenue.create({
      amount: resolvedAmount,
      date: resolvedDate,
      description: resolvedDescription,
      tag: resolvedTag,
      payment_method: resolvedPaymentMethod,
      project_id: fee.project_id || null,
      project_name: fee.project_name || null,
      fee_id: fee.id,
    });

    // Create BankCash or PettyCash entry
    const isCash = resolvedPaymentMethod === 'cash';
    if (isCash) {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: resolvedAmount,
        date: resolvedDate,
        description: resolvedDescription,
        category: 'Incasso Cliente',
        type: 'in',
      });
    } else {
      await base44.asServiceRole.entities.BankCash.create({
        amount: resolvedAmount,
        date: resolvedDate,
        description: resolvedDescription,
        category: 'Incasso Cliente',
        type: 'deposit',
      });
    }

    // Update Google Calendar event if connected (mark as PAGATO)
    if (installment.google_event_id) {
      try {
        await base44.functions.invoke('syncInstallmentCalendarEvent', {
          installment_id,
          action: 'mark_paid',
        });
      } catch (_calErr) {
        // Calendar sync failure is non-blocking
      }
    }

    // Check if the sum of paid installment revenues covers the full fee amount
    // If so, mark fee as "Incassati" — syncFeeToRevenue will skip creating a duplicate
    // because revenues linked via fee_id already exist from the installment flow.
    const allRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: installment.fee_id });
    const totalIncassato = allRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const feeAmount = fee.amount || 0;

    if (feeAmount > 0 && totalIncassato >= feeAmount) {
      await base44.asServiceRole.entities.Fee.update(installment.fee_id, {
        payment_status: 'Incassati',
      });
    } else {
      // Keep as "Da incassare" while partial payments are being collected
      await base44.asServiceRole.entities.Fee.update(installment.fee_id, {
        payment_status: 'Da incassare',
      });
    }

    return Response.json({
      success: true,
      message: 'Pagamento elaborato con successo',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});