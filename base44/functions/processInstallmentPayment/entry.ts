import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAmount(override, fallback) {
  const v = override != null ? Number(override) : Number(fallback);
  return isNaN(v) ? 0 : v;
}

function toRevenuePaymentMethod(instMethod) {
  const map = { bank: 'bank_transfer', cash: 'cash', other: 'bank_transfer' };
  return map[instMethod] || 'bank_transfer';
}

function buildRevenueDescription(installment, fee) {
  const kindLabel = installment.kind === 'acconto' ? 'Acconto' : installment.kind === 'saldo' ? 'Saldo' : 'Rata';
  let desc = `${kindLabel} - Incasso compenso`;
  if (fee.client_name) desc += ` - ${fee.client_name}`;
  if (fee.project_name) desc += ` - ${fee.project_name}`;
  return desc;
}

function resolveDefaultRevenueTag(fee) {
  const categoryTagMap = {
    'Progettazione': 'Progettazione',
    'Direzione Lavori': 'Direzione Lavori',
    'Pratiche Burocratiche': 'Burocrazia',
    'Provvigioni': 'Provvigione',
  };
  return categoryTagMap[fee.category] || 'Incasso Clienti';
}

async function recomputeFeePaymentStatus(base44, feeId) {
  const installments = await base44.asServiceRole.entities.Installment.filter({ fee_id: feeId });
  if (installments.length === 0) return;

  const allPaid = installments.every(i => i.status === 'paid');
  const newStatus = allPaid ? 'Incassati' : 'Da incassare';

  const fees = await base44.asServiceRole.entities.Fee.filter({ id: feeId });
  const fee = fees[0];
  if (fee && fee.payment_status !== newStatus) {
    await base44.asServiceRole.entities.Fee.update(feeId, { payment_status: newStatus });
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let user;
  try {
    user = await base44.auth.me();
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

  const installments = await base44.entities.Installment.filter({ id: installment_id });
  const installment = installments[0];

  if (!installment) {
    return Response.json({ error: 'Installment not found' }, { status: 404 });
  }

  const fees = await base44.entities.Fee.filter({ id: installment.fee_id });
  const fee = fees[0];

  if (!fee) {
    return Response.json({ error: 'Associated fee not found' }, { status: 404 });
  }

  const resolvedDate = payment_date || todayIsoDate();
  const resolvedAmount = normalizeAmount(amount_override, installment.amount || 0);
  const resolvedDescription = revenue_description || buildRevenueDescription(installment, fee);
  const resolvedPaymentMethod = payment_method || toRevenuePaymentMethod(installment.payment_method);
  const resolvedTag = revenue_tag || resolveDefaultRevenueTag(fee);

  // Mark installment as paid
  await base44.asServiceRole.entities.Installment.update(installment_id, {
    status: 'paid',
    paid_date: resolvedDate,
  });

  // Create or update linked revenue
  const revenuePayload = {
    amount: resolvedAmount,
    date: resolvedDate,
    description: resolvedDescription,
    tag: resolvedTag,
    payment_method: resolvedPaymentMethod,
    project_id: fee.project_id || null,
    project_name: fee.project_name || null,
    fee_id: fee.id,
  };

  await base44.asServiceRole.entities.Revenue.create(revenuePayload);

  // Create cash transaction
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

  // Sync calendar if applicable
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

  // Recompute fee payment status
  await recomputeFeePaymentStatus(base44, installment.fee_id);

  return Response.json({ success: true, message: 'Pagamento elaborato con successo' });
});