import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculateCashForecast } from '@/components/utils/cashForecast.jsx';

export function useCashForecastInputs() {
  return useQuery({
    queryKey: ['cashData'],
    queryFn: async () => {
      const [revenues, expenses, forecasts, openingBalances, installments] = await Promise.all([
        base44.entities.Revenue.list(),
        base44.entities.Expense.list(),
        base44.entities.Forecast.list(),
        base44.entities.OpeningBalance.list(),
        base44.entities.Installment.list(),
      ]);

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const previousYear = currentYear - 1;

      const bankOpening = openingBalances.find((ob) => ob.type === 'bank' && ob.year === currentYear)?.amount || 0;
      const pettyOpening = openingBalances.find((ob) => ob.type === 'petty' && ob.year === currentYear)?.amount || 0;

      const bankRevenues = revenues
        .filter((revenue) => !revenue.payment_method || ['bank_transfer', 'card'].includes(revenue.payment_method))
        .reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
      const bankExpenses = expenses
        .filter((expense) => !expense.payment_method || ['bank_transfer', 'card'].includes(expense.payment_method))
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const bankTotal = bankOpening + bankRevenues - bankExpenses;

      const pettyRevenues = revenues
        .filter((revenue) => revenue.payment_method === 'cash')
        .reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
      const pettyExpenses = expenses
        .filter((expense) => expense.payment_method === 'cash')
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const pettyTotal = pettyOpening + pettyRevenues - pettyExpenses;

      const currentForecast = forecasts.find((forecast) => forecast.month === currentMonth && forecast.year === currentYear);
      const forecastNet = currentForecast
        ? (currentForecast.revenue_amount || 0) - (currentForecast.expense_amount || 0)
        : 0;

      const ytdRevenues = revenues.filter((revenue) => revenue.date?.startsWith(String(currentYear)));
      const ytdExpenses = expenses.filter((expense) => expense.date?.startsWith(String(currentYear)));
      const cfIncassiYTD = ytdRevenues.reduce((sum, revenue) => sum + (revenue.amount || 0), 0);
      const cfSpeseYTD = ytdExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

      const riporti = installments
        .filter((installment) => installment.status !== 'paid' && installment.status !== 'cancelled')
        .reduce((sum, installment) => sum + (installment.amount || 0), 0);

      const previousYearRevenues = revenues.filter((revenue) => revenue.date?.startsWith(String(previousYear)));
      const baseAnnoPrecedente = previousYearRevenues.reduce((sum, revenue) => sum + (revenue.amount || 0), 0);

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
        .filter((installment) => installment.status !== 'paid' && installment.status !== 'cancelled')
        .reduce((sum, installment) => sum + (installment.amount || 0), 0);

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
    },
    refetchInterval: 30000,
  });
}
