import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backfill: trova Installment paid senza Revenue e Fee Incassati senza Revenue
 * e crea i Revenue mancanti. Da eseguire una sola volta (idempotente).
 * Solo admin.
 */

function categoryToTag(category) {
  const map = {
    'Progettazione': 'Progettazione',
    'Direzione Lavori': 'Direzione Lavori',
    'Pratiche Burocratiche': 'Burocrazia',
    'Provvigioni': 'Provvigione',
  };
  return map[category] || 'Incasso Clienti';
}

function toRevenuePaymentMethod(instMethod) {
  if (instMethod === 'cash') return 'cash';
  return 'bank_transfer';
}

function feePaymentToRevenueMethod(feeMethod) {
  if (feeMethod === 'Contanti') return 'cash';
  return 'bank_transfer';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const counters = { installments_fixed: 0, fees_fixed: 0, errors: [] };

    // ── 1. Installment paid senza Revenue ──────────────────────────────────
    const allInstallments = await base44.asServiceRole.entities.Installment.list('-created_date', 500);
    const paidInstallments = allInstallments.filter(i => i.status === 'paid');

    for (const inst of paidInstallments) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const existingRevs = await base44.asServiceRole.entities.Revenue.filter({ installment_id: inst.id });
        if (existingRevs.length > 0) continue; // già collegato

        const fees = await base44.asServiceRole.entities.Fee.filter({ id: inst.fee_id });
        const fee = fees[0];
        if (!fee) continue;

        const revenueDate = inst.paid_date || inst.due_date || new Date().toISOString().split('T')[0];
        const kindLabel = inst.kind === 'acconto' ? 'Acconto' : inst.kind === 'saldo' ? 'Saldo' : 'Rata';

        await base44.asServiceRole.entities.Revenue.create({
          amount: inst.amount,
          date: revenueDate,
          description: `${kindLabel} - Incasso compenso - ${fee.client_name || ''}${fee.project_name ? ' - ' + fee.project_name : ''}`,
          tag: categoryToTag(fee.category),
          payment_method: toRevenuePaymentMethod(inst.payment_method),
          project_id: fee.project_id || null,
          project_name: fee.project_name || null,
          fee_id: fee.id,
          installment_id: inst.id,
        });

        counters.installments_fixed++;
      } catch (err) {
        counters.errors.push(`installment ${inst.id}: ${err.message}`);
      }
    }

    // ── 2. Fee Incassati senza Revenue ─────────────────────────────────────
    const allFees = await base44.asServiceRole.entities.Fee.list('-created_date', 500);
    const paidFees = allFees.filter(f => f.payment_status === 'Incassati');

    for (const fee of paidFees) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const existingRevs = await base44.asServiceRole.entities.Revenue.filter({ fee_id: fee.id });
        if (existingRevs.length > 0) continue; // già ha revenue

        const revenueDate = fee.date || new Date().toISOString().split('T')[0];

        await base44.asServiceRole.entities.Revenue.create({
          amount: fee.amount,
          date: revenueDate,
          description: `Compenso ${fee.category} - ${fee.client_name || ''}`,
          tag: categoryToTag(fee.category),
          payment_method: feePaymentToRevenueMethod(fee.payment_method),
          project_id: fee.project_id || null,
          project_name: fee.project_name || null,
          fee_id: fee.id,
        });

        counters.fees_fixed++;
      } catch (err) {
        counters.errors.push(`fee ${fee.id}: ${err.message}`);
      }
    }

    console.log('[reconcileRevenueBackfill] done', counters);
    return Response.json({ success: true, ...counters });
  } catch (error) {
    console.error('[reconcileRevenueBackfill] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});