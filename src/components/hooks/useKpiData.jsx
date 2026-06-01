import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  KPI_DEFINITIONS, 
  formatKpiValue, 
  getKpiTarget,
  calculateKPIStatus,
} from '../lib/kpiDashboard';
import { calculateCashForecast } from '../utils/cashForecast';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { useRevenues, useExpenses, useInstallments, useOpeningBals, useQuotes } from '../../hooks/entities';

/**
 * Hook per calcolare i KPI in tempo reale dai dati dell'app.
 * Riusa le query condivise da hooks/entities.js → zero fetch duplicati.
 */
export function useKpiData() {
  const { data: revenues = [] }       = useRevenues();
  const { data: expenses = [] }       = useExpenses();
  const { data: installments = [] }   = useInstallments();
  const { data: openingBalances = [] } = useOpeningBals();
  const { data: quotes = [] }         = useQuotes();

  const kpiData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const previousYear = currentYear - 1;

    const bankOpening = openingBalances.find(ob => ob.type === 'bank' && ob.year === currentYear)?.amount || 0;
    const pettyOpening = openingBalances.find(ob => ob.type === 'petty' && ob.year === currentYear)?.amount || 0;
    
    const bankRevenues = revenues
      .filter(r => !r.payment_method || ['bank_transfer', 'card'].includes(r.payment_method))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const bankExpenses = expenses
      .filter(e => !e.payment_method || ['bank_transfer', 'card'].includes(e.payment_method))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const pettyRevenues = revenues
      .filter(r => r.payment_method === 'cash')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const pettyExpenses = expenses
      .filter(e => e.payment_method === 'cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const cassaAttuale = (bankOpening + bankRevenues - bankExpenses) + (pettyOpening + pettyRevenues - pettyExpenses);

    const ytdRevenues = revenues.filter(r => r.date?.startsWith(String(currentYear)));
    const ytdExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)));
    const cfIncassiYTD = ytdRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const cfSpeseYTD = ytdExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const riporti = installments
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const previousYearRevenues = revenues.filter(r => r.date?.startsWith(String(previousYear)));
    const baseAnnoPrecedente = previousYearRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

    const cashForecast = calculateCashForecast({
      cassaAttuale,
      riporti,
      percentualeIncasso: 0.70,
      baseAnnoPrecedente,
      growthRate: 0.35,
      speseAnnuePreviste: 117000,
      cfIncassiYTD,
      cfSpeseYTD,
      meseCorrente: currentMonth,
    });

    const cassaFineAnno = cashForecast.cassaFinaleAnnoPrevista;

    const totalRevenues = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const feesDue = installments
      .filter(i => i.status === 'pending' || i.status === 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const indiceIncassi = feesDue > 0 ? (totalRevenues / feesDue) * 100 : 100;

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const speseAttese = 117000 * (currentMonth / 12);
    const indiceSpese = speseAttese > 0 ? totalExpenses / speseAttese : 1;

    const wonQuotes = quotes.filter(q => q.status === 'won');
    const backlogAmount = wonQuotes.reduce((sum, q) => sum + (q.amount || 0), 0);
    const mediaRicaviMensili = totalRevenues / Math.max(currentMonth, 1);
    const backlogMesi = mediaRicaviMensili > 0 ? backlogAmount / mediaRicaviMensili : 0;

    const kpiResults = calculateKPIStatus({
      Cassa_Attuale: cassaAttuale,
      Cassa_Fine_Anno_Prevista: cassaFineAnno,
      Indice_Incassi: indiceIncassi / 100,
      Indice_Spese: indiceSpese,
      Backlog_Mesi: backlogMesi,
    });

    const result = {};
    kpiResults.forEach(kpi => {
      const definition = KPI_DEFINITIONS[kpi.id];
      if (definition) {
        result[kpi.id] = {
          id: kpi.id,
          label: kpi.label,
          category: definition.category || 'generale',
          value: kpi.value,
          formattedValue: formatKpiValue(kpi.value, definition.format),
          status: kpi.status === 'green' ? 'ok' : kpi.status === 'yellow' ? 'attention' : 'critical',
          icon: kpi.icon,
          target: getKpiTarget(kpi.id),
          formula: definition.formula,
          thresholds: definition.thresholds,
        };
      }
    });

    return result;
  }, [revenues, expenses, installments, openingBalances, quotes]);

  return {
    kpis: kpiData,
    isLoading: revenues.length === 0 && expenses.length === 0,
    error: null,
  };
}

/**
 * Hook per lo storico dei KPI (snapshot)
 */
export function useKpiHistory(kpiId, months = 6) {
  return useQuery({
    queryKey: ['kpiHistory', kpiId, months],
    queryFn: async () => {
      const snapshots = await base44.entities.KpiSnapshot.filter(
        { kpi_id: kpiId },
        '-created_date',
        months
      );
      return snapshots.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    },
  });
}