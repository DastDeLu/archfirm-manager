// KPI Thresholds and Logic

export const KPI_DEFINITIONS = {
  fatturato: {
    id: 'fatturato',
    label: 'Fatturato',
    category: 'finanziari',
    format: 'currency',
    formula: 'Somma ricavi mensili',
    thresholds: {
      ok: 80000,
      attention: 70000,
    },
    lessIsBetter: false,
  },
  marginePercentuale: {
    id: 'marginePercentuale',
    label: 'Margine %',
    category: 'economici',
    format: 'percentage',
    formula: '(Ricavi - Costi Variabili) / Ricavi * 100',
    thresholds: {
      ok: 40,
      attention: 35,
    },
    lessIsBetter: false,
  },
  ebitdaPercentuale: {
    id: 'ebitdaPercentuale',
    label: 'EBITDA %',
    category: 'economici',
    format: 'percentage',
    formula: '(Ricavi - Costi Totali) / Ricavi * 100',
    thresholds: {
      ok: 35,
      attention: 30,
    },
    lessIsBetter: false,
  },
  cassa: {
    id: 'cassa',
    label: 'Cassa',
    category: 'finanziari',
    format: 'currency',
    formula: 'Saldo bancario + Petty Cash',
    thresholds: {
      ok: 65000,
      attention: 55000,
    },
    lessIsBetter: false,
  },
  indiceIncasso: {
    id: 'indiceIncasso',
    label: 'Indice Incasso',
    category: 'finanziari',
    format: 'percentage',
    formula: 'Incassi / Fatturato * 100',
    thresholds: {
      ok: 90,
      attention: 80,
    },
    lessIsBetter: false,
  },
  backlog: {
    id: 'backlog',
    label: 'Backlog',
    category: 'operativi',
    format: 'currency',
    formula: 'Preventivi accettati non ancora fatturati',
    thresholds: {
      ok: 100000,
      attention: 80000,
    },
    lessIsBetter: false,
  },
  oreNonFatturatoPercentuale: {
    id: 'oreNonFatturatoPercentuale',
    label: 'Ore Non Fatturate %',
    category: 'operativi',
    format: 'percentage',
    formula: '(Ore Effettive - Ore Fatturate) / Ore Effettive * 100',
    thresholds: {
      ok: 15,
      attention: 20,
    },
    lessIsBetter: true, // Lower is better
  },
  ricavoPerOra: {
    id: 'ricavoPerOra',
    label: 'Ricavo/h',
    category: 'operativi',
    format: 'currency',
    formula: 'Fatturato / Ore Fatturate',
    thresholds: {
      ok: 90,
      attention: 80,
    },
    lessIsBetter: false,
  },
  costiFissiSuRicavi: {
    id: 'costiFissiSuRicavi',
    label: 'Costi Fissi/Ricavi',
    category: 'economici',
    format: 'percentage',
    formula: 'Costi Fissi / Ricavi * 100',
    thresholds: {
      ok: 25,
      attention: 30,
    },
    lessIsBetter: true, // Lower is better
  },
  dividendoSostenibile: {
    id: 'dividendoSostenibile',
    label: 'Dividendo Sostenibile',
    category: 'decisioni',
    format: 'currency',
    formula: 'EBITDA * 50%',
    thresholds: {
      ok: 12000,
      attention: 10000,
    },
    lessIsBetter: false,
  },
};

/**
 * Determines KPI status based on value and thresholds
 * @param {string} kpiId - KPI identifier
 * @param {number} value - Current KPI value
 * @param {Object} thresholds - Custom thresholds (optional)
 * @param {boolean} lessIsBetter - Override lessIsBetter logic (optional)
 * @returns {'ok' | 'attention' | 'critical'}
 */
export function getKpiStatus(kpiId, value, thresholds = null, lessIsBetter = null) {
  const kpi = KPI_DEFINITIONS[kpiId];
  if (!kpi) return 'ok';

  const useThresholds = thresholds || kpi.thresholds;
  const useLessIsBetter = lessIsBetter !== null ? lessIsBetter : kpi.lessIsBetter;

  if (useLessIsBetter) {
    // For "less is better" KPIs (inverted logic)
    if (value <= useThresholds.ok) return 'ok';
    if (value <= useThresholds.attention) return 'attention';
    return 'critical';
  } else {
    // For "more is better" KPIs (normal logic)
    if (value >= useThresholds.ok) return 'ok';
    if (value >= useThresholds.attention) return 'attention';
    return 'critical';
  }
}

/**
 * Formats KPI value based on format type
 * @param {number} value - Value to format
 * @param {string} format - Format type (currency, percentage)
 * @returns {string}
 */
export function formatKpiValue(value, format) {
  if (format === 'currency') {
    return `€${value.toLocaleString('it-IT')}`;
  }
  if (format === 'percentage') {
    return `${value.toFixed(1)}%`;
  }
  return value.toString();
}

/**
 * Gets target label for KPI
 * @param {string} kpiId - KPI identifier
 * @param {Object} thresholds - Custom thresholds (optional)
 * @param {boolean} lessIsBetter - Override lessIsBetter logic (optional)
 * @param {string} format - Override format (optional)
 * @returns {string}
 */
export function getKpiTarget(kpiId, thresholds = null, lessIsBetter = null, format = null) {
  const kpi = KPI_DEFINITIONS[kpiId];
  if (!kpi) return '';

  const useThresholds = thresholds || kpi.thresholds;
  const useLessIsBetter = lessIsBetter !== null ? lessIsBetter : kpi.lessIsBetter;
  const useFormat = format || kpi.format;
  const targetValue = useThresholds.ok;
  const formattedTarget = formatKpiValue(targetValue, useFormat);
  
  if (useLessIsBetter) {
    return `Target: ≤ ${formattedTarget}`;
  } else {
    return `Target: ≥ ${formattedTarget}`;
  }
}

export const KPI_CATEGORIES = {
  finanziari: ['fatturato', 'cassa', 'indiceIncasso'],
  economici: ['marginePercentuale', 'ebitdaPercentuale', 'costiFissiSuRicavi'],
  operativi: ['backlog', 'oreNonFatturatoPercentuale', 'ricavoPerOra'],
  decisioni: ['dividendoSostenibile'],
};

export const CATEGORY_LABELS = {
  finanziari: 'KPI Finanziari',
  economici: 'KPI Economici',
  operativi: 'KPI Operativi',
  decisioni: 'Supporto Decisioni',
};

// Mock data for KPI Dashboard
export const mockKpiData = {
  fatturato: 85000,
  marginePercentuale: 38,
  ebitdaPercentuale: 33,
  cassa: 67000,
  indiceIncasso: 92,
  backlog: 125000,
  oreNonFatturatoPercentuale: 18,
  ricavoPerOra: 95,
  costiFissiSuRicavi: 28,
  dividendoSostenibile: 15000,
  
  // Additional context data
  oreEffettive: 650,
  oreFatturate: 533,
  costiFissi: 23800,
  ricaviTotali: 85000,
};