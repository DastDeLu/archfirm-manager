export const getExpensesByTag = (expenses, tag) =>
  expenses.filter((e) => e.tag === tag);

export const getRevenuesByTag = (revenues, tag) =>
  revenues.filter((r) => r.tag === tag);

export const sumAmount = (items) =>
  items.reduce((sum, i) => sum + (i.amount || 0), 0);