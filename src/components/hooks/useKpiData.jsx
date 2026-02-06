import { useMemo } from 'react';
import { mockKpiData } from '../data/mockKpiData';
import { 
  KPI_DEFINITIONS, 
  getKpiStatus, 
  formatKpiValue, 
  getKpiTarget 
} from '../lib/kpiDashboard';

/**
 * Custom hook to fetch and compute KPI data
 * @returns {Object} Computed KPI data with status, formatted values, and metadata
 */
export function useKpiData() {
  const kpiData = useMemo(() => {
    const result = {};

    Object.keys(KPI_DEFINITIONS).forEach(kpiId => {
      const kpi = KPI_DEFINITIONS[kpiId];
      const rawValue = mockKpiData[kpiId];
      
      result[kpiId] = {
        id: kpiId,
        label: kpi.label,
        category: kpi.category,
        value: rawValue,
        formattedValue: formatKpiValue(rawValue, kpi.format),
        status: getKpiStatus(kpiId, rawValue),
        target: getKpiTarget(kpiId),
        formula: kpi.formula,
      };
    });

    return result;
  }, []);

  return {
    kpis: kpiData,
    isLoading: false,
    error: null,
  };
}