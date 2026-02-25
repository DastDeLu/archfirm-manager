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
 * @param {string} format - Format type (currency, percentage, ratio, months)
 * @returns {string}
 */
export function formatKpiValue(value, format) {
  if (format === 'currency') {
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (format === 'percentage') {
    return `${value.toFixed(1)}%`;
  }
  if (format === 'ratio') {
    return `${value.toFixed(2)}`;
  }
  if (format === 'months') {
    return `${value.toFixed(1)} mesi`;
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
  finanziari: ['cassaAttuale', 'cassaFineAnno', 'indiceIncasso'],
  economici: ['indiceSpese'],
  operativi: ['backlogMesi'],
};

export const CATEGORY_LABELS = {
  finanziari: 'KPI Finanziari',
  economici: 'KPI Economici',
  operativi: 'KPI Operativi',
};

/**
 * Calcola i 5 KPI fondamentali con logica a semaforo
 * @param {Object} input - Oggetto con i valori di input
 * @param {number} input.Cassa_Attuale - Saldo attuale in cassa
 * @param {number} input.Cassa_Fine_Anno_Prevista - Previsione cassa a fine anno
 * @param {number} input.Indice_Incassi - Rapporto incassi reali/attesi (0-1 o 0-100)
 * @param {number} input.Indice_Spese - Rapporto spese reali/attese
 * @param {number} input.Backlog_Mesi - Mesi di copertura del backlog
 * @returns {Array<Object>} Array di oggetti KPI con id, label, value, status, icon
 */
export function calculateKPIStatus(input) {
  const {
    Cassa_Attuale,
    Cassa_Fine_Anno_Prevista,
    Indice_Incassi,
    Indice_Spese,
    Backlog_Mesi,
  } = input;

  // Normalizza Indice_Incassi se è espresso come percentuale (0-100)
  const indiceIncassiNormalized = Indice_Incassi > 1 ? Indice_Incassi : Indice_Incassi * 100;

  return [
    {
      id: 'cassaAttuale',
      label: 'Cassa Attuale',
      value: Cassa_Attuale,
      status: Cassa_Attuale >= 65000 ? 'green' : Cassa_Attuale >= 55000 ? 'yellow' : 'red',
      icon: Cassa_Attuale >= 65000 ? '🟢' : Cassa_Attuale >= 55000 ? '🟡' : '🔴',
    },
    {
      id: 'cassaFineAnno',
      label: 'Cassa Prevista Fine Anno',
      value: Cassa_Fine_Anno_Prevista,
      status: Cassa_Fine_Anno_Prevista >= 70000 ? 'green' : Cassa_Fine_Anno_Prevista >= 55000 ? 'yellow' : 'red',
      icon: Cassa_Fine_Anno_Prevista >= 70000 ? '🟢' : Cassa_Fine_Anno_Prevista >= 55000 ? '🟡' : '🔴',
    },
    {
      id: 'indiceIncasso',
      label: 'Ritardo Incassi',
      value: indiceIncassiNormalized,
      status: indiceIncassiNormalized >= 90 ? 'green' : indiceIncassiNormalized >= 80 ? 'yellow' : 'red',
      icon: indiceIncassiNormalized >= 90 ? '🟢' : indiceIncassiNormalized >= 80 ? '🟡' : '🔴',
    },
    {
      id: 'indiceSpese',
      label: 'Spese vs Budget',
      value: Indice_Spese,
      status: Indice_Spese <= 1.00 ? 'green' : Indice_Spese <= 1.10 ? 'yellow' : 'red',
      icon: Indice_Spese <= 1.00 ? '🟢' : Indice_Spese <= 1.10 ? '🟡' : '🔴',
    },
    {
      id: 'backlogMesi',
      label: 'Backlog (Copertura)',
      value: Backlog_Mesi,
      status: Backlog_Mesi >= 4 ? 'green' : 'red',
      icon: Backlog_Mesi >= 4 ? '🟢' : '🔴',
    },
  ];
}

// Esempio di utilizzo con dati di test
export const mockKpiData = {
  Cassa_Attuale: 73404,
  Cassa_Fine_Anno_Prevista: 52000,
  Indice_Incassi: 0.85, // può essere 0.85 o 85
  Indice_Spese: 1.15,
  Backlog_Mesi: 5,
};

// Risultato dell'esempio:
// calculateKPIStatus(mockKpiData) restituisce:
// [
//   { id: 'cassaAttuale', label: 'Cassa Attuale', value: 73404, status: 'green', icon: '🟢' },
//   { id: 'cassaFineAnno', label: 'Cassa Prevista Fine Anno', value: 52000, status: 'red', icon: '🔴' },
//   { id: 'indiceIncasso', label: 'Ritardo Incassi', value: 85, status: 'yellow', icon: '🟡' },
//   { id: 'indiceSpese', label: 'Spese vs Budget', value: 1.15, status: 'red', icon: '🔴' },
//   { id: 'backlogMesi', label: 'Backlog (Copertura)', value: 5, status: 'green', icon: '🟢' }
// ]