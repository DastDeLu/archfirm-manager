/**
 * Centralizzazione funzioni di formattazione numerica
 * Usa sempre il formato italiano: 1.000,00
 */

/**
 * Formatta un importo in euro con 2 decimali e separatore delle migliaia
 * @param {number} value
 * @returns {string} es. "€1.000,00"
 */
export function formatCurrency(value) {
  const n = Number(value) || 0;
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatta un numero con separatore delle migliaia
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {string} es. "1.000"
 */
export function formatNumber(value, decimals = 0) {
  const n = Number(value) || 0;
  return n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Formatta una percentuale
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string} es. "12,5%"
 */
export function formatPercent(value, decimals = 1) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

/**
 * Ticker per assi grafici (k abbreviato)
 * @param {number} value
 * @returns {string} es. "€1k"
 */
export function tickCurrency(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) {
    return `€${(n / 1000).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
  }
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`;
}