import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: feeRecord, old_data } = await req.json();

    if (!feeRecord || !feeRecord.id) {
      return Response.json({ error: 'Fee data required' }, { status: 400 });
    }

    // Only process if status changed FROM "Da incassare" TO "Incassati"
    const statusChangedToCollected = 
      old_data?.payment_status === 'Da incassare' && 
      feeRecord.payment_status === 'Incassati';

    if (!statusChangedToCollected) {
      return Response.json({ 
        success: true, 
        message: 'No status change to collected, no action needed' 
      });
    }

    // Create Revenue record
    const revenueData = {
      amount: feeRecord.amount,
      date: feeRecord.date || new Date().toISOString().split('T')[0],
      description: `Compenso ${feeRecord.category} - ${feeRecord.client_name}`,
      tag: feeRecord.category === 'Provvigioni' ? 'Provvigione' : 
           feeRecord.category === 'Direzione Lavori' ? 'Direzione Lavori' :
           feeRecord.category === 'Pratiche Burocratiche' ? 'Burocrazia' : 'Progettazione',
      payment_method: feeRecord.payment_method === 'Banca' ? 'bank_transfer' : 'cash'
    };

    await base44.asServiceRole.entities.Revenue.create(revenueData);

    return Response.json({ 
      success: true,
      message: 'Revenue created and cash flow updated',
      revenue: revenueData
    });

  } catch (error) {
    console.error('Error syncing fee to revenue:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});