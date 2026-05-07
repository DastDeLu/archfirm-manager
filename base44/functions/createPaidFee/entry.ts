import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Crea atomicamente un Compenso (Fee) con payment_status='Incassati'
 * insieme al Revenue e al movimento cassa/banca corrispondenti.
 * Usare al posto di Fee.create() directo quando payment_status='Incassati'.
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fee_data } = body;

    if (!fee_data) return Response.json({ error: 'fee_data required' }, { status: 400 });

    // 1. Crea il compenso
    const fee = await base44.asServiceRole.entities.Fee.create({
      ...fee_data,
      payment_status: 'Incassati',
      owner_id: user.id,
    });

    // 2. Crea il Revenue collegato
    const revenuePaymentMethod = fee_data.payment_method === 'Banca' ? 'bank_transfer' : 'cash';
    const revenueDate = fee_data.date || new Date().toISOString().split('T')[0];

    await base44.asServiceRole.entities.Revenue.create({
      amount: fee_data.amount,
      date: revenueDate,
      description: `Compenso ${fee_data.category} - ${fee_data.client_name || ''}`,
      tag: categoryToTag(fee_data.category),
      payment_method: revenuePaymentMethod,
      project_id: fee_data.project_id || null,
      project_name: fee_data.project_name || null,
      fee_id: fee.id,
      owner_id: user.id,
    });

    // 3. Crea il movimento cassa/banca
    const movDescription = `Compenso ${fee_data.category} - ${fee_data.client_name || ''}`;
    if (fee_data.payment_method === 'Banca') {
      await base44.asServiceRole.entities.BankCash.create({
        amount: fee_data.amount,
        date: revenueDate,
        description: movDescription,
        category: fee_data.category,
        type: 'deposit',
        owner_id: user.id,
      });
    } else {
      await base44.asServiceRole.entities.PettyCash.create({
        amount: fee_data.amount,
        date: revenueDate,
        description: movDescription,
        category: fee_data.category,
        type: 'in',
        owner_id: user.id,
      });
    }

    return Response.json({ success: true, fee_id: fee.id });
  } catch (error) {
    console.error('[createPaidFee] error:', error.message);
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ error: error.message }, { status: 500 });
  }
});