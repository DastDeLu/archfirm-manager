/**
 * hooks/entities.js
 * 
 * Hook entità condivisi con chiavi cache user-scoped uniformi.
 * Ogni entità viene scaricata UNA sola volta per sessione e condivisa
 * tra tutti i consumer (Dashboard, useKpiData, useCashForecastInputs,
 * BudgetContext, NotificationCenter, ecc.)
 * 
 * Chiavi formato: [entityName, uid]
 * → React Query deduplica automaticamente fetch con la stessa chiave.
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

function makeEntityHook(entityName, listFn) {
  return function useEntity(options = {}) {
    const uid = useCurrentUserId();
    return useQuery({
      queryKey: [entityName, uid],
      queryFn: listFn,
      enabled: !!uid,
      ...options,
    });
  };
}

export const useRevenues      = makeEntityHook('revenues',      () => base44.entities.Revenue.list());
export const useExpenses      = makeEntityHook('expenses',      () => base44.entities.Expense.list());
export const useInstallments  = makeEntityHook('installments',  () => base44.entities.Installment.list());
export const useOpeningBals   = makeEntityHook('openingBalances', () => base44.entities.OpeningBalance.list());
export const useForecasts     = makeEntityHook('forecasts',     () => base44.entities.Forecast.list());
export const useFees          = makeEntityHook('fees',          () => base44.entities.Fee.list());
export const useQuotes        = makeEntityHook('quotes',        () => base44.entities.Quote.list());
export const useProjects      = makeEntityHook('projects',      () => base44.entities.Project.list());
export const useClients       = makeEntityHook('clients',       () => base44.entities.Client.list());
export const useObjectives    = makeEntityHook('objectives',    () => base44.entities.Objective.list());
export const useMarketingBudgets = makeEntityHook('marketing',  () => base44.entities.MarketingBudget.list());