import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this automated check
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get all non-paid installments
    const installments = await base44.asServiceRole.entities.Installment.list();
    
    let updatedCount = 0;
    const overdueIds = [];

    for (const installment of installments) {
      if (installment.status !== 'paid' && 
          installment.status !== 'cancelled' && 
          installment.due_date && 
          installment.due_date < today) {
        
        // Update to overdue status
        await base44.asServiceRole.entities.Installment.update(installment.id, {
          status: 'overdue'
        });
        
        updatedCount++;
        overdueIds.push(installment.id);

        // Update parent fee status if not already overdue
        const fees = await base44.asServiceRole.entities.Fee.filter({ id: installment.fee_id });
        if (fees[0] && fees[0].status !== 'overdue' && fees[0].status !== 'paid') {
          await base44.asServiceRole.entities.Fee.update(installment.fee_id, {
            status: 'overdue'
          });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Controllate ${installments.length} rate, ${updatedCount} marcate come scadute`,
      overdueCount: updatedCount,
      overdueIds
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});