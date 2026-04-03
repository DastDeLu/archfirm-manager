import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { assertOwned, requireUser, stampOwnerExtra, withAuth } from '../_lib/authz.ts';
import {
  buildRevenueDescription,
  normalizeAmount,
  recomputeFeePaymentStatus,
  resolveDefaultRevenueTag,
  toInstallmentPaymentMethod,
  toRevenuePaymentMethod,
  todayIsoDate,
} from '../_lib/revenueInstallmentSync.ts';

function isDifferent(currentValue: unknown, nextValue: unknown): boolean {
  return currentValue !== nextValue;
}

Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);
  const body = await req.json();

  const action = body?.action || 'sync';
  const revenueId = body?.revenue_id;
  const installmentId = body?.installment_id;

  if (action === 'delete_revenue') {
    if (!revenueId) {
      return Response.json({ error: 'revenue_id required' }, { status: 400 });
    }

    const revenues = await base44.entities.Revenue.filter({ id: revenueId });
    const revenue = revenues[0];
    if (!revenue) {
      return Response.json({ error: 'Revenue not found' }, { status: 404 });
    }
    assertOwned(revenue, user.id);

    await base44.asServiceRole.entities.Revenue.delete(revenue.id);

    if (revenue.installment_id) {
      const installments = await base44.asServiceRole.entities.Installment.filter({ id: revenue.installment_id });
      const installment = installments[0];
      if (installment) {
        assertOwned(installment, user.id);
        await base44.asServiceRole.entities.Installment.update(installment.id, {
          status: 'pending',
          paid_date: '',
        });
      }
    }

    if (revenue.fee_id) {
      await recomputeFeePaymentStatus(base44, revenue.fee_id);
    }

    return Response.json({ success: true, message: 'Revenue deleted and installment reconciled' });
  }

  const origin = body?.origin;
  if (origin !== 'installment' && origin !== 'revenue') {
    return Response.json({ error: 'origin must be installment or revenue' }, { status: 400 });
  }

  const installmentPatch = body?.installment_patch || {};
  const revenuePatch = body?.revenue_patch || {};

  let revenue = null as any;
  if (revenueId) {
    const revenues = await base44.entities.Revenue.filter({ id: revenueId });
    revenue = revenues[0];
    if (!revenue) return Response.json({ error: 'Revenue not found' }, { status: 404 });
    assertOwned(revenue, user.id);
  }

  let installment = null as any;
  const resolvedInstallmentId = installmentId || revenue?.installment_id;
  if (!resolvedInstallmentId) {
    return Response.json({ error: 'installment_id required (or linked revenue with installment_id)' }, { status: 400 });
  }

  const installments = await base44.entities.Installment.filter({ id: resolvedInstallmentId });
  installment = installments[0];
  if (!installment) {
    return Response.json({ error: 'Installment not found' }, { status: 404 });
  }
  assertOwned(installment, user.id);

  if (!revenue) {
    const linkedRevenues = await base44.asServiceRole.entities.Revenue.filter({ installment_id: installment.id });
    revenue = linkedRevenues[0] || null;
    if (revenue) assertOwned(revenue, user.id);
  }

  const fees = await base44.entities.Fee.filter({ id: installment.fee_id });
  const fee = fees[0];
  if (!fee) {
    return Response.json({ error: 'Associated fee not found' }, { status: 404 });
  }
  assertOwned(fee, user.id);

  const defaultTag = await resolveDefaultRevenueTag(base44);

  const resolvedAmount = origin === 'revenue'
    ? normalizeAmount(revenuePatch.amount ?? revenue?.amount, installment.amount || 0)
    : normalizeAmount(installmentPatch.amount ?? installment.amount, revenue?.amount || 0);

  const resolvedRevenueDate = origin === 'revenue'
    ? (revenuePatch.date || revenue?.date || installment.paid_date || todayIsoDate())
    : (installmentPatch.paid_date || installment.paid_date || revenuePatch.date || revenue?.date || todayIsoDate());

  const resolvedInstallmentMethod = origin === 'revenue'
    ? toInstallmentPaymentMethod(revenuePatch.payment_method || revenue?.payment_method)
    : (installmentPatch.payment_method || installment.payment_method || 'bank');

  const resolvedRevenuePaymentMethod = origin === 'revenue'
    ? (revenuePatch.payment_method || revenue?.payment_method || toRevenuePaymentMethod(resolvedInstallmentMethod))
    : (revenuePatch.payment_method || revenue?.payment_method || toRevenuePaymentMethod(resolvedInstallmentMethod));

  const resolvedInstallmentStatus = origin === 'revenue'
    ? 'paid'
    : (installmentPatch.status || installment.status || 'pending');

  const resolvedInstallmentPaidDate = resolvedInstallmentStatus === 'paid'
    ? (installmentPatch.paid_date || installment.paid_date || resolvedRevenueDate || todayIsoDate())
    : '';

  const installmentUpdatePayload: Record<string, unknown> = {};
  if (isDifferent(installment.amount, resolvedAmount)) installmentUpdatePayload.amount = resolvedAmount;
  if (isDifferent(installment.payment_method, resolvedInstallmentMethod)) installmentUpdatePayload.payment_method = resolvedInstallmentMethod;
  if (isDifferent(installment.status, resolvedInstallmentStatus)) installmentUpdatePayload.status = resolvedInstallmentStatus;
  if (isDifferent(installment.paid_date || '', resolvedInstallmentPaidDate || '')) installmentUpdatePayload.paid_date = resolvedInstallmentPaidDate;

  if (Object.keys(installmentUpdatePayload).length > 0) {
    installment = await base44.asServiceRole.entities.Installment.update(installment.id, installmentUpdatePayload);
  }

  if (resolvedInstallmentStatus === 'paid') {
    const resolvedDescription = revenuePatch.description
      || revenue?.description
      || buildRevenueDescription(installment, fee);
    const resolvedTag = revenuePatch.tag || revenue?.tag || defaultTag;

    const revenuePayload = {
      amount: resolvedAmount,
      date: resolvedRevenueDate,
      payment_method: resolvedRevenuePaymentMethod,
      description: resolvedDescription,
      tag: resolvedTag,
      project_id: fee.project_id || null,
      project_name: fee.project_name || null,
      fee_id: fee.id,
      installment_id: installment.id,
      ...stampOwnerExtra(user.id),
    };

    // Anti-loop guard: all cross-entity writes happen in this single server call,
    // so client code no longer performs chained Installment.update -> Revenue.update
    // (or reverse) that could bounce indefinitely.
    if (revenue) {
      const shouldUpdateRevenue =
        isDifferent(revenue.amount, revenuePayload.amount)
        || isDifferent(revenue.date, revenuePayload.date)
        || isDifferent(revenue.payment_method, revenuePayload.payment_method)
        || isDifferent(revenue.description, revenuePayload.description)
        || isDifferent(revenue.tag, revenuePayload.tag)
        || isDifferent(revenue.project_id || null, revenuePayload.project_id)
        || isDifferent(revenue.project_name || null, revenuePayload.project_name);

      if (shouldUpdateRevenue) {
        await base44.asServiceRole.entities.Revenue.update(revenue.id, revenuePayload);
      }
    } else {
      await base44.asServiceRole.entities.Revenue.create(revenuePayload);
    }
  }

  await recomputeFeePaymentStatus(base44, fee.id);

  return Response.json({
    success: true,
    message: 'Installment and revenue synchronized',
    installment_id: installment.id,
    revenue_id: revenue?.id || null,
  });
}));
