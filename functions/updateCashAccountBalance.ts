import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const WEBHOOK_SECRET = Deno.env.get('SYNC_WEBHOOK_SECRET');
const VALID_ENTITY_TYPES = ['Revenue', 'Expense'];
const VALID_OPERATIONS = ['create', 'update', 'delete'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const authHeader = req.headers.get('x-webhook-secret');
    const isWebhook = WEBHOOK_SECRET && authHeader === WEBHOOK_SECRET;

    if (!isWebhook) {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Only admin users can call this manually
      if (user.role !== 'Sviluppatore') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { entity_type, entity_id, operation } = await req.json();

    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      return Response.json({ error: 'Invalid entity type' }, { status: 400 });
    }
    if (!VALID_OPERATIONS.includes(operation)) {
      return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
    if (!entity_id || typeof entity_id !== 'string') {
      return Response.json({ error: 'Invalid entity_id' }, { status: 400 });
    }

    let transaction;
    if (entity_type === 'Revenue') {
      transaction = await base44.asServiceRole.entities.Revenue.get(entity_id);
    } else {
      transaction = await base44.asServiceRole.entities.Expense.get(entity_id);
    }

    if (!transaction || !transaction.cash_account_id) {
      return Response.json({ message: 'No cash account linked' }, { status: 200 });
    }

    const account = await base44.asServiceRole.entities.CashAccount.get(transaction.cash_account_id);
    if (!account) {
      return Response.json({ error: 'Cash account not found' }, { status: 404 });
    }

    let newBalance = account.balance || 0;

    if (operation === 'create' || operation === 'update') {
      if (entity_type === 'Revenue') {
        newBalance += transaction.amount;
      } else {
        newBalance -= transaction.amount;
      }
    } else if (operation === 'delete') {
      if (entity_type === 'Revenue') {
        newBalance -= transaction.amount;
      } else {
        newBalance += transaction.amount;
      }
    }

    await base44.asServiceRole.entities.CashAccount.update(transaction.cash_account_id, { balance: newBalance });

    return Response.json({ success: true, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});