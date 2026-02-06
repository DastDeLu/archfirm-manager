import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  KPI_DEFINITIONS, 
  getKpiStatus, 
  formatKpiValue, 
  getKpiTarget,
  mockKpiData
} from '../lib/kpiDashboard';

/**
 * Custom hook to fetch and compute KPI data with dynamic targets
 * @returns {Object} Computed KPI data with status, formatted values, and metadata
 */
export function useKpiData() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { data: targets = [] } = useQuery({
    queryKey: ['kpiTargets', currentYear, currentMonth],
    queryFn: async () => {
      const allTargets = await base44.entities.KpiTarget.list();
      return allTargets.filter(t => {
        if (t.year !== currentYear) return false;
        if (t.period_type === 'monthly' && t.month === currentMonth) return true;
        if (t.period_type === 'quarterly') {
          const quarter = Math.ceil(currentMonth / 3);
          return t.quarter === quarter;
        }
        if (t.period_type === 'annual') return true;
        return false;
      });
    },
  });

  const kpiData = useMemo(() => {
    const result = {};

    Object.keys(KPI_DEFINITIONS).forEach(kpiId => {
      const kpi = KPI_DEFINITIONS[kpiId];
      const rawValue = mockKpiData[kpiId];
      
      // Find dynamic target or use default
      const dynamicTarget = targets.find(t => t.kpi_id === kpiId);
      const thresholds = dynamicTarget 
        ? { ok: dynamicTarget.target_ok, attention: dynamicTarget.target_attention }
        : kpi.thresholds;
      
      const status = getKpiStatus(kpiId, rawValue, thresholds, kpi.lessIsBetter);
      
      result[kpiId] = {
        id: kpiId,
        label: kpi.label,
        category: kpi.category,
        value: rawValue,
        formattedValue: formatKpiValue(rawValue, kpi.format),
        status,
        target: getKpiTarget(kpiId, thresholds, kpi.lessIsBetter, kpi.format),
        formula: kpi.formula,
        thresholds,
        hasDynamicTarget: !!dynamicTarget,
      };
    });

    return result;
  }, [targets]);

  return {
    kpis: kpiData,
    isLoading: false,
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