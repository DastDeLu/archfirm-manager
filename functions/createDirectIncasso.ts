import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const VALID_PAYMENT_METHODS = ['Banca', 'Contanti'];
const MAX_AMOUNT = 10_000_000;
const MAX_DESCRIPTION_LENGTH = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fee_id, amount, date, payment_method, description } = await req.json();

    // --- Input validation ---
    if (!amount || !date || !payment_method) {
      return Response.json({ error: 'Campi obbligatori mancanti: amount, date, payment_method' }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > MAX_AMOUNT) {
      return Response.json({ error: 'amount non valido (deve essere > 0 e <= 10.000.000)' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'date non valida (formato atteso: YYYY-MM-DD)' }, { status: 400 });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return Response.json({ error: 'date non valida' }, { status: 400 });
    }

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return Response.json({ error: `payment_method non valido. Valori accettati: ${VALID_PAYMENT_METHODS.join(', ')}` }, { status: 400 });
    }

    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return Response.json({ error: `description troppo lunga (max ${MAX_DESCRIPTION_LENGTH} caratteri)` }, { status: 400 });
    }

    if (fee_id && (typeof fee_id !== 'string' || fee_id.length < 4)) {
      return Response.json({ error: 'fee_id non valido' }, { status: 400 });
    }
    // --- Fine validazione ---

    let fee = null;
    if (fee_id) {
      const fees = await base44.entities.Fee.filter({ id: fee_id });
      fee = fees[0];
      if (!fee) return Response.json({ error: 'Compenso non trovato' }, { status: 404 });
    }

    const defaultTag = 'Incasso Clienti';

    let installmentNumber = 1;
    if (fee_id) {
      const existing = await base44.asServiceRole.entities.Installment.filter({ fee_id });
      installmentNumber = existing.length + 1;
    }

    if (fee_id) {
      await base44.asServiceRole.entities.Installment.create({
        fee_id,
        amount: amountNum,
        due_date: date,
        paid_date: date,
        payment_method: payment_method === 'Banca' ? 'bank' : 'cash',
        status: 'paid',
        installment_number: installmentNumber,
        notes: description || ''
      });
    }

    await base44.asServiceRole.entities.Revenue.create({
      amount: amountNum,
      date,
      description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
      tag: defaultTag,
      payment_method: payment_method === 'Banca' ? 'bank_transfer' : 'cash',
      project_name: fee?.project_name || null,
      fee_id: fee_id || null
    });

    if (payment_method === 'Banca') {
      await base44.asServiceRole.entities.BankCash.create({
        amount: amountNum,
        date,
        description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
        category: 'Incasso Cliente',
        type: 'deposit'
      });
    } else {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: amountNum,
        date,
        description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
        category: 'Incasso Cliente',
        type: 'in'
      });
    }

    if (fee_id && fee) {
      const allRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id });
      const totalIncassato = allRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
      const feeAmount = fee.amount || 0;
      if (feeAmount > 0 && totalIncassato >= feeAmount) {
        await base44.asServiceRole.entities.Fee.update(fee_id, { payment_status: 'Incassati' });
      }
    }

    return Response.json({ success: true, message: 'Incasso registrato con successo' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});