import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Registra un incasso diretto da compenso (Fee).
 * Crea: Installment (paid) + Revenue + BankCash/PettyCash.
 * Se fee_id è fornito, aggiorna anche lo stato del compenso.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fee_id, amount, date, payment_method, description } = await req.json();

    if (!amount || !date || !payment_method) {
      return Response.json({ error: 'Campi obbligatori mancanti: amount, date, payment_method' }, { status: 400 });
    }

    let fee = null;
    if (fee_id) {
      const fees = await base44.entities.Fee.filter({ id: fee_id });
      fee = fees[0];
      if (!fee) return Response.json({ error: 'Compenso non trovato' }, { status: 404 });
    }

    // Tag fisso per incassi da Previsionale Incassi
    const defaultTag = 'Incasso Clienti';

    // Conta installments esistenti per generare il numero rata
    let installmentNumber = 1;
    if (fee_id) {
      const existing = await base44.asServiceRole.entities.Installment.filter({ fee_id });
      installmentNumber = existing.length + 1;
    }

    // Crea Installment (già pagato)
    if (fee_id) {
      await base44.asServiceRole.entities.Installment.create({
        fee_id,
        amount,
        due_date: date,
        paid_date: date,
        payment_method: payment_method === 'Banca' ? 'bank' : 'cash',
        status: 'paid',
        installment_number: installmentNumber,
        notes: description || ''
      });
    }

    // Crea Revenue
    await base44.asServiceRole.entities.Revenue.create({
      amount,
      date,
      description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
      tag: defaultTag,
      payment_method: payment_method === 'Banca' ? 'bank_transfer' : 'cash',
      project_name: fee?.project_name || null
    });

    // Crea BankCash o PettyCash
    if (payment_method === 'Banca') {
      await base44.asServiceRole.entities.BankCash.create({
        amount,
        date,
        description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
        category: 'Incasso Cliente',
        type: 'deposit'
      });
    } else {
      await base44.asServiceRole.entities.PettyCash.create({
        amount,
        date,
        description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
        category: 'Incasso Cliente',
        type: 'in'
      });
    }

    // Aggiorna stato Fee se fornita
    if (fee_id && fee) {
      await base44.asServiceRole.entities.Fee.update(fee_id, {
        payment_status: 'Incassati'
      });
    }

    return Response.json({ success: true, message: 'Incasso registrato con successo' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});