import React from 'react';
import { useKpiData } from '../components/hooks/useKpiData';
import { KPI_CATEGORIES, CATEGORY_LABELS } from '../components/lib/kpiDashboard';
import PageHeader from '../components/ui/PageHeader';
import KpiCard from '../components/dashboard/KpiCard';
import { Activity } from 'lucide-react';

export default function ControlDashboard() {
  const { kpis, isLoading, error } = useKpiData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Caricamento KPI...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Errore nel caricamento dei dati</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Cruscotto di Controllo Mensile" 
        description="Dashboard KPI con logica semaforo per monitoraggio performance"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Activity className="h-4 w-4" />
          <span>Aggiornato in tempo reale</span>
        </div>
      </PageHeader>

      <div className="space-y-8">
        {Object.entries(KPI_CATEGORIES).map(([categoryId, kpiIds]) => (
          <div key={categoryId}>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {CATEGORY_LABELS[categoryId]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpiIds.map(kpiId => {
                const kpi = kpis[kpiId];
                return kpi ? <KpiCard key={kpi.id} kpi={kpi} /> : null;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Legenda Semaforo</h3>
        <div className="flex flex-wrap gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600">OK - Target raggiunto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600">Attenzione - Sotto target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600">Critico - Intervento necessario</span>
          </div>
        </div>
      </div>
    </div>
  );
}