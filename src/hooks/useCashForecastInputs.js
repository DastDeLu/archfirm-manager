import { useMemo } from 'react';
import { useRevenues, useExpenses, useForecasts, useOpeningBals, useInstallments } from '@/hooks/entities';
import { calculateCashForecast } from '@/components/utils/cashForecast.jsx';

/**
 * Calcola i dati della cassa riusando le query entità condivise.
 * Non esegue fetch propri: i dati arrivano dalla cache di React Query.
 */
export function useCashForecastInputs() {
  const { data: revenues = [], isLoading: r }      = useRevenues();
  const { data: expenses = [], isLoading: e }      = useExpenses();
  const { data: forecasts = [], isLoading: f }     = useForecasts();
  const { data: openingBalances = [], isLoading: o } = useOpeningBals();
  const { data: installments = [], isLoading: i }  = useInstallments();

  const isLoading = r || e || f || o || i;

  const data = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const previousYear = currentYear - 1;

    const bankOpening  = openingBalances.find(ob => ob.type === 'bank'  && ob.year === currentYear)?.amount || 0;
    const pettyOpening = openingBalances.find(ob => ob.type === 'petty' && ob.year === currentYear)?.amount || 0;

    const bankRevenues = revenues
      .filter(rev => !rev.payment_method || ['bank_transfer', 'card'].includes(rev.payment_method))
      .reduce((sum, rev) => sum + (rev.amount || 0), 0);
    const bankExpenses = expenses
      .filter(exp => !exp.payment_method || ['bank_transfer', 'card'].includes(exp.payment_method))
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const bankTotal = bankOpening + bankRevenues - bankExpenses;

    const pettyRevenues = revenues
      .filter(rev => rev.payment_method === 'cash')
      .reduce((sum, rev) => sum + (rev.amount || 0), 0);
    const pettyExpenses = expenses
      .filter(exp => exp.payment_method === 'cash')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const pettyTotal = pettyOpening + pettyRevenues - pettyExpenses;

    const currentForecast = forecasts.find(fc => fc.month === currentMonth && fc.year === currentYear);
    const forecastNet = currentForecast
      ? (currentForecast.revenue_amount || 0) - (currentForecast.expense_amount || 0)
      : 0;

    const ytdRevenues  = revenues.filter(rev => rev.date?.startsWith(String(currentYear)));
    const ytdExpenses  = expenses.filter(exp => exp.date?.startsWith(String(currentYear)));
    const cfIncassiYTD = ytdRevenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
    const cfSpeseYTD   = ytdExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const riporti = installments
      .filter(inst => inst.status !== 'paid' && inst.status !== 'cancelled')
      .reduce((sum, inst) => sum + (inst.amount || 0), 0);

    const previousYearRevenues = revenues.filter(rev => rev.date?.startsWith(String(previousYear)));
    const baseAnnoPrecedente   = previousYearRevenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);

    const cashForecast = calculateCashForecast({
      cassaAttuale: bankTotal,
      riporti,
      percentualeIncasso: 0.70,
      baseAnnoPrecedente,
      growthRate: 0.35,
      speseAnnuePreviste: 117000,
      cfIncassiYTD,
      cfSpeseYTD,
      meseCorrente: currentMonth,
    });

    const expectedCash = installments
      .filter(inst => inst.status !== 'paid' && inst.status !== 'cancelled')
      .reduce((sum, inst) => sum + (inst.amount || 0), 0);

    return {
      bankCash: bankTotal,
      pettyCash: pettyTotal,
      forecast: forecastNet,
      expectedCash,
      cashForecastAlerts: cashForecast.alerts,
      deltaIncassiYTD: cashForecast.deltaIncassiYTD,
      targetIncassiYTD: cashForecast.targetIncassiYTD,
      cfIncassiYTD: cashForecast.cfIncassiYTD,
    };
  }, [revenues, expenses, forecasts, openingBalances, installments]);

  // Restituisce oggetto compatibile con l'API di useQuery usata nel Layout
  return { data, isLoading };
}