/**
 * Calcola la previsione di cassa a fine anno con alert su liquidità, incassi e spese.
 * 
 * @param {Object} params - Parametri per il calcolo
 * @param {number} params.cassaAttuale - Cassa disponibile attuale
 * @param {number} params.riporti - Importi riportati da incassare
 * @param {number} params.percentualeIncasso - Percentuale di incasso attesa (es. 0.70)
 * @param {number} params.baseAnnoPrecedente - Incassi totali anno precedente
 * @param {number} params.growthRate - Tasso di crescita annuale (es. 0.35)
 * @param {number} params.speseAnnuePreviste - Spese annue previste
 * @param {number} params.cfIncassiYTD - Incassi year-to-date
 * @param {number} params.cfSpeseYTD - Spese year-to-date
 * @param {number} params.meseCorrente - Mese corrente (1-12)
 * @returns {Object} - Risultati con cassaFineAnnoPrevista, incassiAttesiTotali, alerts
 */
export function calculateCashForecast({
  cassaAttuale,
  riporti,
  percentualeIncasso,
  baseAnnoPrecedente,
  growthRate,
  speseAnnuePreviste,
  cfIncassiYTD,
  cfSpeseYTD,
  meseCorrente
}) {
  // Calcolo incassi attesi totali
  const incassiRiporti = riporti * percentualeIncasso;
  const targetAnnuale = baseAnnoPrecedente * (1 + growthRate);
  const incassiTargetAnnoCorrente = targetAnnuale - cfIncassiYTD;
  const incassiAttesiTotali = incassiRiporti + incassiTargetAnnoCorrente;

  // Calcolo spese residue
  const speseResidue = speseAnnuePreviste - cfSpeseYTD;

  // Previsione cassa fine anno
  const cassaFineAnnoPrevista = Math.round(cassaAttuale + incassiAttesiTotali - speseResidue);

  // Sistema di alert
  const alerts = [];

  // Alert liquidità
  if (cassaFineAnnoPrevista < 55000) {
    alerts.push({
      id: 'liquidita',
      level: 'critical',
      message: `Cassa prevista a fine anno: €${cassaFineAnnoPrevista.toLocaleString('it-IT')}. Sotto la soglia critica di €55.000.`
    });
  } else if (cassaFineAnnoPrevista < 65000) {
    alerts.push({
      id: 'liquidita',
      level: 'attention',
      message: `Cassa prevista a fine anno: €${cassaFineAnnoPrevista.toLocaleString('it-IT')}. Sotto la soglia di attenzione di €65.000.`
    });
  } else {
    alerts.push({
      id: 'liquidita',
      level: 'ok',
      message: `Cassa prevista a fine anno: €${cassaFineAnnoPrevista.toLocaleString('it-IT')}. Liquidità in linea con gli obiettivi.`
    });
  }

  // Alert incassi
  const targetIncassiMensile = targetAnnuale / 12;
  const targetIncassiYTD = targetIncassiMensile * meseCorrente;
  const percentualeRaggiungimento = (cfIncassiYTD / targetIncassiYTD) * 100;

  if (percentualeRaggiungimento < 70) {
    alerts.push({
      id: 'incassi',
      level: 'critical',
      message: `Incassi YTD al ${percentualeRaggiungimento.toFixed(0)}% del target. Critico rispetto all'obiettivo annuale.`
    });
  } else if (percentualeRaggiungimento < 90) {
    alerts.push({
      id: 'incassi',
      level: 'attention',
      message: `Incassi YTD al ${percentualeRaggiungimento.toFixed(0)}% del target. In ritardo rispetto all'obiettivo.`
    });
  } else {
    alerts.push({
      id: 'incassi',
      level: 'ok',
      message: `Incassi YTD al ${percentualeRaggiungimento.toFixed(0)}% del target. In linea con l'obiettivo annuale.`
    });
  }

  // Alert spese
  const targetSpeseMensile = speseAnnuePreviste / 12;
  const targetSpeseYTD = targetSpeseMensile * meseCorrente;
  const percentualeSpeseReale = (cfSpeseYTD / targetSpeseYTD) * 100;

  if (percentualeSpeseReale > 110) {
    alerts.push({
      id: 'spese',
      level: 'critical',
      message: `Spese YTD al ${percentualeSpeseReale.toFixed(0)}% del budget. Supera il budget previsto.`
    });
  } else if (percentualeSpeseReale > 100) {
    alerts.push({
      id: 'spese',
      level: 'attention',
      message: `Spese YTD al ${percentualeSpeseReale.toFixed(0)}% del budget. Leggermente sopra il previsto.`
    });
  } else {
    alerts.push({
      id: 'spese',
      level: 'ok',
      message: `Spese YTD al ${percentualeSpeseReale.toFixed(0)}% del budget. Sotto controllo.`
    });
  }

  return {
    cassaFineAnnoPrevista,
    incassiAttesiTotali,
    speseResidue,
    alerts
  };
}