import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_type, entity_id, operation } = await req.json();

    // Fetch the transaction
    let transaction;
    if (entity_type === 'Revenue') {
      transaction = await base44.asServiceRole.entities.Revenue.get(entity_id);
    } else if (entity_type === 'Expense') {
      transaction = await base44.asServiceRole.entities.Expense.get(entity_id);
    } else {
      return Response.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (!transaction || !transaction.cash_account_id) {
      return Response.json({ message: 'No cash account linked' }, { status: 200 });
    }

    // Fetch current account
    const account = await base44.asServiceRole.entities.CashAccount.get(transaction.cash_account_id);
    if (!account) {
      return Response.json({ error: 'Cash account not found' }, { status: 404 });
    }

    let newBalance = account.balance || 0;

    // Update balance based on operation
    if (operation === 'create' || operation === 'update') {
      if (entity_type === 'Revenue') {
        newBalance += transaction.amount;
      } else if (entity_type === 'Expense') {
        newBalance -= transaction.amount;
      }
    } else if (operation === 'delete') {
      // Reverse the transaction
      if (entity_type === 'Revenue') {
        newBalance -= transaction.amount;
      } else if (entity_type === 'Expense') {
        newBalance += transaction.amount;
      }
    }

    // Update account
    await base44.asServiceRole.entities.CashAccount.update(transaction.cash_account_id, {
      balance: newBalance
    });

    return Response.json({ 
      success: true, 
      new_balance: newBalance 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});