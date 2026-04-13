import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── helpers ──────────────────────────────────────────────────────────────────

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAmount(primary, fallback) {
  const v = parseFloat(primary);
  return Number.isFinite(v) && v > 0 ? v : (parseFloat(fallback) || 0);
}

function toInstallmentPaymentMethod(revenueMethod) {
  if (revenueMethod === 'cash') return 'cash';
  return 'bank';
}

function toRevenuePaymentMethod(installmentMethod) {
  if (installmentMethod === 'cash') return 'cash';
  return 'bank_transfer';
}

function buildRevenueDescription(installment, fee) {
  const parts = [];
  if (fee?.category) parts.push(fee.category);
  if (fee?.client_name) parts.push(fee.client_name);
  if (fee?.project_name) parts.push(fee.project_name);
  if (installment?.installment_number) parts.push(`Rata ${installment.installment_number}`);
  return parts.join(' - ') || 'Pagamento';
}

async function resolveDefaultRevenueTag(base44) {
  try {
    const tags = await base44.entities.CustomTag.filter({ type: 'revenue' });
    return tags?.[0]?.name || 'Incasso Clienti';
  } catch {
    return 'Incasso Clienti';
  }
}

async function recomputeFeePaymentStatus(base44, feeId) {
  try {
    const fees = await base44.asServiceRole.entities.Fee.filter({ id: feeId });
    const fee = fees?.[0];
    if (!fee) return;

    const revenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: feeId });
    const totalPaid = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const feeAmount = fee.amount || 0;

    const newStatus = totalPaid >= feeAmount ? 'Incassati' : 'Da incassare';
    if (fee.payment_status !== newStatus) {
      await base44.asServiceRole.entities.Fee.update(fee.id, { payment_status: newStatus });
    }
  } catch (err) {
    console.error('[syncInstallmentRevenuePair] recomputeFeePaymentStatus error:', err.message);
  }
}

function isDifferent(a, b) {
  return a !== b;
}

// ── auth helpers ──────────────────────────────────────────────────────────────

async function requireUser(base44) {
  const user = await base44.auth.me();
  if (!user) throw new Error('Unauthorized');
  return user;
}

function assertOwned(record, userId, userEmail) {
  if (!record) return;
  const owner = record.owner_id || record.ownerId || record.created_by;
  if (!owner) return;
  if (owner === userId || owner === String(userId) || owner === userEmail) return;
  throw new Error('Forbidden: not the owner of this record');
}

function stampOwnerExtra(userId) {
  return { owner_id: userId };
}

// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const body = await req.json();

    const action = body?.action || 'sync';
    const revenueId = body?.revenue_id;
    const installmentId = body?.installment_id;
    const userEmail = user.email;

    // ── DELETE REVENUE ──────────────────────────────────────────────────────
    if (action === 'delete_revenue') {
      if (!revenueId) {
        return Response.json({ error: 'revenue_id required' }, { status: 400 });
      }

      // Use asServiceRole so RLS does not block the read before the ownership check
      let revenue = null;
      try {
        const list = await base44.asServiceRole.entities.Revenue.filter({ id: revenueId });
        revenue = list?.[0] ?? null;
      } catch (fetchErr) {
        console.error('[delete_revenue] fetch error:', fetchErr.message);
      }
      if (!revenue) {
        return Response.json({ error: 'Revenue not found' }, { status: 404 });
      }
      const rowId = revenue.id ?? revenue._id;
      if (!rowId) {
        return Response.json({ error: 'Revenue record has no id' }, { status: 500 });
      }

      await base44.asServiceRole.entities.Revenue.delete(rowId);

      const linkedInstallmentId = revenue.installment_id ?? revenue.installmentId;
      if (linkedInstallmentId) {
        const installments = await base44.asServiceRole.entities.Installment.filter({ id: linkedInstallmentId });
        const installment = installments[0];
        if (installment) {
          const instRowId = installment.id ?? installment._id;
          if (instRowId) {
            await base44.asServiceRole.entities.Installment.update(instRowId, {
              status: 'pending',
              paid_date: '',
            });
          }
        }
      }

      const linkedFeeId = revenue.fee_id ?? revenue.feeId;
      if (linkedFeeId) {
        await recomputeFeePaymentStatus(base44, linkedFeeId);
      }

      return Response.json({ success: true, message: 'Revenue deleted and installment reconciled' });
    }

    // ── SYNC ────────────────────────────────────────────────────────────────
    const origin = body?.origin;
    if (origin !== 'installment' && origin !== 'revenue') {
      return Response.json({ error: 'origin must be installment or revenue' }, { status: 400 });
    }

    const installmentPatch = body?.installment_patch || {};
    const revenuePatch = body?.revenue_patch || {};

    let revenue = null;
    if (revenueId) {
      try {
        revenue = await base44.asServiceRole.entities.Revenue.get(revenueId);
      } catch {
        /* try filter */
      }
      if (!revenue) {
        const list = await base44.asServiceRole.entities.Revenue.filter({ id: revenueId });
        revenue = list?.[0] ?? null;
      }
      if (!revenue) return Response.json({ error: 'Revenue not found' }, { status: 404 });
    }

    const resolvedInstallmentId =
      installmentId || revenue?.installment_id || revenue?.installmentId;
    if (!resolvedInstallmentId) {
      return Response.json({ error: 'installment_id required (or linked revenue with installment_id)' }, { status: 400 });
    }

    let installment = null;
    const installments = await base44.asServiceRole.entities.Installment.filter({ id: resolvedInstallmentId });
    installment = installments[0];
    if (!installment) {
      return Response.json({ error: 'Installment not found' }, { status: 404 });
    }
    if (!revenue) {
      const linkedRevenues = await base44.asServiceRole.entities.Revenue.filter({ installment_id: installment.id });
      revenue = linkedRevenues[0] || null;
    }

    const fees = await base44.asServiceRole.entities.Fee.filter({ id: installment.fee_id });
    const fee = fees[0];
    if (!fee) {
      return Response.json({ error: 'Associated fee not found' }, { status: 404 });
    }
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

    const installmentUpdatePayload = {};
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

  } catch (error) {
    console.error('[syncInstallmentRevenuePair] error:', error.message);
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message?.startsWith('Forbidden')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});