import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useKpiData } from '../components/hooks/useKpiData';
import { KPI_CATEGORIES, CATEGORY_LABELS } from '../components/lib/kpiDashboard';
import PageHeader from '../components/ui/PageHeader';
import KpiCard from '../components/dashboard/KpiCard';
import KpiHistoryChart from '../components/dashboard/KpiHistoryChart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Settings, TrendingUp } from 'lucide-react';

export default function ControlDashboard() {
  const { kpis, isLoading, error } = useKpiData();
  const [selectedKpiForHistory, setSelectedKpiForHistory] = useState(null);

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Activity className="h-4 w-4" />
            <span>Aggiornato in tempo reale</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={createPageUrl('Objectives')}>
              <Settings className="h-4 w-4 mr-2" />
              Gestisci Obiettivi
            </Link>
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="current" className="mb-6">
        <TabsList>
          <TabsTrigger value="current">Vista Corrente</TabsTrigger>
          <TabsTrigger value="history">Andamento Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">

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
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Seleziona KPI per visualizzare lo storico</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(kpis).map(([kpiId, kpi]) => (
                <Button
                  key={kpiId}
                  variant={selectedKpiForHistory === kpiId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedKpiForHistory(kpiId)}
                >
                  {kpi.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedKpiForHistory ? (
            <div className="grid gap-6">
              <KpiHistoryChart 
                kpiId={selectedKpiForHistory} 
                kpiLabel={kpis[selectedKpiForHistory]?.label}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <TrendingUp className="h-12 w-12 mb-4 text-slate-300" />
              <p>Seleziona un KPI per visualizzare il suo andamento storico</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}