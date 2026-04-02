import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireUser, assertOwned, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);

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

  // Load installment through the user-scoped client. If the platform's entity
  // permissions are configured, this already filters to the caller's own data.
  const installments = await base44.entities.Installment.filter({ id: installment_id });
  const installment = installments[0];

  if (!installment) {
    return Response.json({ error: 'Installment not found' }, { status: 404 });
  }

  // Explicit ownership gate: enforced once owner_user_id is set on the record
  // (post-migration). Returns 404 to avoid leaking resource existence.
  assertOwned(installment, user.id);

  const fees = await base44.entities.Fee.filter({ id: installment.fee_id });
  const fee = fees[0];

  if (!fee) {
    return Response.json({ error: 'Associated fee not found' }, { status: 404 });
  }

  assertOwned(fee, user.id);

  const resolvedDate = payment_date || new Date().toISOString().split('T')[0];
  const resolvedAmount = amount_override && !isNaN(amount_override) ? amount_override : installment.amount;
  const resolvedDescription = revenue_description || `Incasso rata ${installment.installment_number || ''} - ${fee.project_name || fee.client_name || 'Progetto'}`;
  const resolvedPaymentMethod = payment_method || (installment.payment_method === 'cash' ? 'cash' : 'bank_transfer');

  let resolvedTag = revenue_tag;
  if (!resolvedTag) {
    try {
      const customTags = await base44.asServiceRole.entities.CustomTag.filter({ type: 'revenue' });
      resolvedTag = customTags.length > 0 ? customTags[0].name : 'Progettazione';
    } catch {
      resolvedTag = 'Progettazione';
    }
  }

  await base44.asServiceRole.entities.Installment.update(installment_id, {
    status: 'paid',
    paid_date: resolvedDate,
  });

  const existingLinkedRevenues = await base44.asServiceRole.entities.Revenue.filter({ installment_id });
  const linkedRevenue = existingLinkedRevenues[0];
  const revenuePayload = {
    amount: resolvedAmount,
    date: resolvedDate,
    description: resolvedDescription,
    tag: resolvedTag,
    payment_method: resolvedPaymentMethod,
    project_id: fee.project_id || null,
    project_name: fee.project_name || null,
    fee_id: fee.id,
    installment_id,
    ...stampOwnerExtra(user.id),
  };

  if (linkedRevenue) {
    await base44.asServiceRole.entities.Revenue.update(linkedRevenue.id, revenuePayload);
  } else {
    await base44.asServiceRole.entities.Revenue.create(revenuePayload);
  }

  const isCash = resolvedPaymentMethod === 'cash';
  if (!linkedRevenue) {
    if (isCash) {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: resolvedAmount,
        date: resolvedDate,
        description: resolvedDescription,
        category: 'Incasso Cliente',
        type: 'in',
        ...stampOwnerExtra(user.id),
      });
    } else {
      await base44.asServiceRole.entities.BankCash.create({
        amount: resolvedAmount,
        date: resolvedDate,
        description: resolvedDescription,
        category: 'Incasso Cliente',
        type: 'deposit',
        ...stampOwnerExtra(user.id),
      });
    }
  }

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

  const allRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: installment.fee_id });
  const totalIncassato = allRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  const feeAmount = fee.amount || 0;

  if (feeAmount > 0 && totalIncassato >= feeAmount) {
    await base44.asServiceRole.entities.Fee.update(installment.fee_id, { payment_status: 'Incassati' });
  } else {
    await base44.asServiceRole.entities.Fee.update(installment.fee_id, { payment_status: 'Da incassare' });
  }

  return Response.json({ success: true, message: 'Pagamento elaborato con successo' });
}));
