import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { fee } = await req.json();

    if (!fee || !fee.id) {
      return Response.json({ error: 'Fee data required' }, { status: 400 });
    }

    // Fetch the full fee record
    const feeRecord = await base44.asServiceRole.entities.Fee.get(fee.id);

    // Only process if status changed to "Incassati"
    if (feeRecord.payment_status !== 'Incassati') {
      return Response.json({ 
        success: true, 
        message: 'Not yet collected, no action needed' 
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
      message: 'Revenue created and cash flow updated'
    });

  } catch (error) {
    console.error('Error syncing fee to revenue:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});