import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, withAuth } from '../_lib/authz.ts';

// Admin batch job: marks overdue installments and their parent fees.
// Restricted to admin role so a regular user cannot trigger cross-account writes.
// When owner_user_id is present on Installment records (post-migration), this job
// can be extended to filter by owner_user_id to avoid loading the entire dataset.
Deno.serve(withAuth(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await requireUser(base44);

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const today = new Date().toISOString().split('T')[0];

  // Service-role list is acceptable for admin batch operations.
  // After the owner_user_id backfill is complete, add a filter like
  // { owner_user_id: <target_user_id> } to scope runs per user if needed.
  const installments = await base44.asServiceRole.entities.Installment.list();

  let updatedCount = 0;
  const overdueIds = [];

  for (const installment of installments) {
    if (
      installment.status !== 'paid' &&
      installment.status !== 'cancelled' &&
      installment.due_date &&
      installment.due_date < today
    ) {
      await base44.asServiceRole.entities.Installment.update(installment.id, { status: 'overdue' });
      updatedCount++;
      overdueIds.push(installment.id);

      const fees = await base44.asServiceRole.entities.Fee.filter({ id: installment.fee_id });
      if (fees[0] && fees[0].status !== 'overdue' && fees[0].status !== 'paid') {
        await base44.asServiceRole.entities.Fee.update(installment.fee_id, { status: 'overdue' });
      }
    }
  }

  return Response.json({
    success: true,
    updated_count: updatedCount,
    overdue_ids: overdueIds,
  });
}));
