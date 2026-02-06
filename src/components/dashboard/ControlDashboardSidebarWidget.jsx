import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { useKpiData } from '../hooks/useKpiData';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

const statusColors = {
  ok: 'bg-emerald-500',
  attention: 'bg-amber-500',
  critical: 'bg-red-500',
};

const TOP_5_KPIS = ['cassa', 'indiceIncasso', 'marginePercentuale', 'ebitdaPercentuale', 'backlog'];

export default function ControlDashboardSidebarWidget() {
  const { kpis, isLoading } = useKpiData();

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-b border-slate-200/60">
        <div className="text-xs text-slate-500">Loading KPIs...</div>
      </div>
    );
  }

  const topKpis = TOP_5_KPIS.map(id => kpis[id]).filter(Boolean);

  return (
    <div className="px-4 py-3 border-b border-slate-200/60">
      <Link 
        to={createPageUrl('ControlDashboard')}
        className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
      >
        <TrendingUp className="h-4 w-4" />
        <span>Cruscotto Controllo</span>
      </Link>
      <div className="space-y-2">
        {topKpis.map(kpi => (
          <div key={kpi.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[kpi.status])} />
              <span className="text-slate-600 truncate">{kpi.label}</span>
            </div>
            <span className="font-medium text-slate-900 ml-2">{kpi.formattedValue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}