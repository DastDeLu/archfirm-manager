export function buildRevenueDescription(installment: any, fee: any): string {
  const installmentNumber = installment?.installment_number ? ` ${installment.installment_number}` : '';
  const projectLabel = fee?.project_name || fee?.client_name || 'Progetto';
  return `Incasso rata${installmentNumber} - ${projectLabel}`;
}

export function toRevenuePaymentMethod(installmentMethod?: string): string {
  return installmentMethod === 'cash' ? 'cash' : 'bank_transfer';
}

export function toInstallmentPaymentMethod(revenueMethod?: string): string {
  return revenueMethod === 'cash' ? 'cash' : 'bank';
}

export function normalizeAmount(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function resolveDefaultRevenueTag(base44: any): Promise<string> {
  try {
    const customTags = await base44.asServiceRole.entities.CustomTag.filter({ type: 'revenue' });
    return customTags.length > 0 ? customTags[0].name : 'Progettazione';
  } catch {
    return 'Progettazione';
  }
}

export async function recomputeFeePaymentStatus(base44: any, feeId: string): Promise<'Incassati' | 'Da incassare' | null> {
  if (!feeId) return null;

  const fees = await base44.asServiceRole.entities.Fee.filter({ id: feeId });
  const fee = fees[0];
  if (!fee) return null;

  const allRevenues = await base44.asServiceRole.entities.Revenue.filter({ fee_id: feeId });
  const totalIncassato = allRevenues.reduce((sum: number, revenue: any) => sum + (revenue.amount || 0), 0);
  const feeAmount = fee.amount || 0;
  const paymentStatus = feeAmount > 0 && totalIncassato >= feeAmount ? 'Incassati' : 'Da incassare';

  await base44.asServiceRole.entities.Fee.update(feeId, { payment_status: paymentStatus });
  return paymentStatus;
}
