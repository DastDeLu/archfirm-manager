/**
 * Elimina un ricavo tramite la cloud function `syncInstallmentRevenuePair` (azione delete_revenue).
 * Centralizza la risposta axios non-unwrapped delle functions.
 */

/** @param {Record<string, unknown> | null | undefined} revenue */
export function getRevenueRowId(revenue) {
  if (!revenue) return '';
  const id = revenue.id ?? revenue._id;
  return id != null && id !== '' ? String(id) : '';
}

/** @param {Promise<unknown>} fnPromise */
export async function assertFunctionResponse(fnPromise) {
  const res = await fnPromise;
  if (res && typeof res === 'object' && !('config' in res) && !('headers' in res)) {
    if (res.error != null && res.error !== '') {
      const msg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
      throw new Error(msg);
    }
    return res;
  }
  const status = res?.status ?? 0;
  const body = res?.data;
  if (status >= 400) {
    const msg =
      (typeof body?.error === 'string' && body.error) ||
      (typeof body?.message === 'string' && body.message) ||
      `Errore server (${status})`;
    throw new Error(msg);
  }
  if (body && typeof body === 'object' && body.error != null && body.error !== '') {
    const msg = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
    throw new Error(msg);
  }
}

/**
 * @param {object} base44 - Client API (es. `@/api/base44Client`)
 * @param {string} revenueId
 */
export async function deleteRevenueByCloudFunction(base44, revenueId) {
  if (!revenueId) {
    throw new Error('Ricavo senza identificativo');
  }
  await assertFunctionResponse(
    base44.functions.invoke('syncInstallmentRevenuePair', {
      action: 'delete_revenue',
      revenue_id: revenueId,
    }),
  );
}
