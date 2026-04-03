import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requireUser, assertOwned, stampOwnerExtra, withAuth } from '../_lib/authz.ts';
import {
  buildRevenueDescription,
  normalizeAmount,
  recomputeFeePaymentStatus,
  resolveDefaultRevenueTag,
  toRevenuePaymentMethod,
  todayIsoDate,
} from '../_lib/revenueInstallmentSync.ts';

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

  const resolvedDate = payment_date || todayIsoDate();
  const resolvedAmount = normalizeAmount(amount_override, installment.amount || 0);
  const resolvedDescription = revenue_description || buildRevenueDescription(installment, fee);
  const resolvedPaymentMethod = payment_method || toRevenuePaymentMethod(installment.payment_method);
  const resolvedTag = revenue_tag || await resolveDefaultRevenueTag(base44);

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

  await recomputeFeePaymentStatus(base44, installment.fee_id);

  return Response.json({ success: true, message: 'Pagamento elaborato con successo' });
}));
