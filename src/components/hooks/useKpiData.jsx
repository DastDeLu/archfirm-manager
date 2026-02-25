import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  KPI_DEFINITIONS, 
  getKpiStatus, 
  formatKpiValue, 
  getKpiTarget,
  calculateKPIStatus,
  mockKpiData
} from '../lib/kpiDashboard';
import { calculateCashForecast } from '../utils/cashForecast';

/**
 * Custom hook per calcolare i KPI in tempo reale dai dati dell'app
 */
export function useKpiData() {
  // Fetch dati necessari per il calcolo dei KPI
  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments'],
    queryFn: () => base44.entities.Installment.list(),
  });

  const { data: openingBalances = [] } = useQuery({
    queryKey: ['openingBalances'],
    queryFn: () => base44.entities.OpeningBalance.list(),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
  });

  const kpiData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const previousYear = currentYear - 1;

    // Calcolo Cassa Attuale
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

    // Calcolo Cassa Fine Anno Prevista usando cashForecast
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
      meseCorrente: currentMonth
    });

    const cassaFineAnno = cashForecast.cassaFinaleAnnoPrevista;

    // Calcolo Indice Incassi
    const totalRevenues = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const feesDue = installments
      .filter(i => i.status === 'pending' || i.status === 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const indiceIncassi = feesDue > 0 ? (totalRevenues / feesDue) * 100 : 100;

    // Calcolo Indice Spese
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const speseAttese = 117000 * (currentMonth / 12); // Budget annuale proporzionato
    const indiceSpese = speseAttese > 0 ? totalExpenses / speseAttese : 1;

    // Calcolo Backlog (in mesi)
    const wonQuotes = quotes.filter(q => q.status === 'won');
    const backlogAmount = wonQuotes.reduce((sum, q) => sum + (q.amount || 0), 0);
    const mediaRicaviMensili = totalRevenues / Math.max(currentMonth, 1);
    const backlogMesi = mediaRicaviMensili > 0 ? backlogAmount / mediaRicaviMensili : 0;

    // Calcola gli stati usando la funzione centralizzata
    const kpiResults = calculateKPIStatus({
      Cassa_Attuale: cassaAttuale,
      Cassa_Fine_Anno_Prevista: cassaFineAnno,
      Indice_Incassi: indiceIncassi / 100, // Normalizza a 0-1
      Indice_Spese: indiceSpese,
      Backlog_Mesi: backlogMesi,
    });

    // Trasforma in formato compatibile con l'UI esistente
    const result = {};
    kpiResults.forEach(kpi => {
      const definition = KPI_DEFINITIONS[kpi.id];
      result[kpi.id] = {
        id: kpi.id,
        label: kpi.label,
        category: definition.category,
        value: kpi.value,
        formattedValue: formatKpiValue(kpi.value, definition.format),
        status: kpi.status === 'green' ? 'ok' : kpi.status === 'yellow' ? 'attention' : 'critical',
        icon: kpi.icon,
        target: getKpiTarget(kpi.id),
        formula: definition.formula,
        thresholds: definition.thresholds,
      };
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
 * Hook to fetch historical KPI snapshots
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