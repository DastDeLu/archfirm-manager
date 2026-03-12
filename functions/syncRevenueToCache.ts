import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: revenueRecord } = await req.json();

    if (!revenueRecord || !revenueRecord.id) {
      return Response.json({ error: 'Revenue data required' }, { status: 400 });
    }

    // Only process creation events
    if (event.type !== 'create') {
      return Response.json({ 
        success: true, 
        message: 'Not a create event, no action needed' 
      });
    }

    // Map payment_method to cash account
    const paymentMethod = revenueRecord.payment_method || 'bank_transfer';
    
    if (paymentMethod === 'cash') {
      // Add to Petty Cash
      await base44.asServiceRole.entities.PettyCash.create({
        amount: revenueRecord.amount,
        date: revenueRecord.date || new Date().toISOString().split('T')[0],
        description: revenueRecord.description || 'Revenue',
        category: revenueRecord.tag || 'Other',
        type: 'in'
      });
    } else {
      // Add to Bank Cash (bank_transfer, card, or other)
      await base44.asServiceRole.entities.BankCash.create({
        amount: revenueRecord.amount,
        date: revenueRecord.date || new Date().toISOString().split('T')[0],
        description: revenueRecord.description || 'Revenue',
        category: revenueRecord.tag || 'Other',
        type: 'deposit'
      });
    }

    return Response.json({ 
      success: true,
      message: 'Cash flow updated with revenue'
    });

  } catch (error) {
    console.error('Error syncing revenue to cash:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});