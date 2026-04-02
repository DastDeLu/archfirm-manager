import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { requireUser, assertOwned, stampOwnerExtra, withAuth } from '../_lib/authz.ts';

/**
 * Registra un incasso diretto da compenso (Fee).
 * Crea: Installment (paid) + Revenue (con fee_id) + BankCash/PettyCash.
 * Dopo la creazione, verifica se la somma degli incassi copre il totale del compenso
 * e aggiorna automaticamente il payment_status a "Incassati".
 */
Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);

  const { fee_id, amount, date, payment_method, description, tag } = await req.json();

  if (!amount || !date || !payment_method) {
    return Response.json(
      { error: 'Campi obbligatori mancanti: amount, date, payment_method' },
      { status: 400 },
    );
  }

  let fee = null;
  if (fee_id) {
    // Load the fee through the user-scoped client so platform permissions apply.
    const fees = await base44.entities.Fee.filter({ id: fee_id });
    fee = fees[0];
    if (!fee) return Response.json({ error: 'Compenso non trovato' }, { status: 404 });

    // Explicit ownership gate: enforced once owner_user_id is set on the record.
    assertOwned(fee, user.id);
  }

  const defaultTag = tag || 'Incasso Clienti';

  let installmentNumber = 1;
  let createdInstallmentId: string | null = null;
  if (fee_id) {
    const existing = await base44.asServiceRole.entities.Installment.filter({ fee_id });
    installmentNumber = existing.length + 1;
  }

  if (fee_id) {
    const createdInstallment = await base44.asServiceRole.entities.Installment.create({
      fee_id,
      amount,
      due_date: date,
      paid_date: date,
      payment_method: payment_method === 'Banca' ? 'bank' : 'cash',
      status: 'paid',
      installment_number: installmentNumber,
      notes: description || '',
      ...stampOwnerExtra(user.id),
    });
    createdInstallmentId = createdInstallment?.id || null;
  }

  await base44.asServiceRole.entities.Revenue.create({
    amount,
    date,
    description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
    tag: defaultTag,
    payment_method: payment_method === 'Banca' ? 'bank_transfer' : 'cash',
    project_name: fee?.project_name || null,
    fee_id: fee_id || null,
    installment_id: createdInstallmentId,
    ...stampOwnerExtra(user.id),
  });

  if (payment_method === 'Banca') {
    await base44.asServiceRole.entities.BankCash.create({
      amount,
      date,
      description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
      category: 'Incasso Cliente',
      type: 'deposit',
      ...stampOwnerExtra(user.id),
    });
  } else {
    await base44.asServiceRole.entities.PettyCash.create({
      amount,
      date,
      description: description || (fee ? `Incasso compenso - ${fee.client_name || 'Cliente'}` : 'Incasso compenso'),
      category: 'Incasso Cliente',
      type: 'in',
      ...stampOwnerExtra(user.id),
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
}));
