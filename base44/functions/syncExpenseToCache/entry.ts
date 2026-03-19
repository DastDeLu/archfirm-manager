import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: expenseRecord } = await req.json();

    if (!expenseRecord || !expenseRecord.id) {
      return Response.json({ error: 'Expense data required' }, { status: 400 });
    }

    // Only process creation events with paid status
    if (event.type !== 'create' || expenseRecord.stato !== 'Pagato') {
      return Response.json({ 
        success: true, 
        message: 'Not a paid expense creation, no action needed' 
      });
    }

    // Map payment_method to cash account
    const paymentMethod = expenseRecord.payment_method || 'bank_transfer';
    
    if (paymentMethod === 'cash') {
      // Subtract from Petty Cash
      await base44.asServiceRole.entities.PettyCash.create({
        amount: expenseRecord.amount,
        date: expenseRecord.date || new Date().toISOString().split('T')[0],
        description: expenseRecord.description || 'Expense',
        category: expenseRecord.tag || 'Other',
        type: 'out'
      });
    } else {
      // Subtract from Bank Cash (bank_transfer, card, or other)
      await base44.asServiceRole.entities.BankCash.create({
        amount: expenseRecord.amount,
        date: expenseRecord.date || new Date().toISOString().split('T')[0],
        description: expenseRecord.description || 'Expense',
        category: expenseRecord.tag || 'Other',
        type: 'withdrawal'
      });
    }

    return Response.json({ 
      success: true,
      message: 'Cash flow updated with expense'
    });

  } catch (error) {
    console.error('Error syncing expense to cash:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});