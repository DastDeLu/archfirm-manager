import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight, TrendingUp, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateObjectiveStatus } from '../objectives/objectiveLogic';
import { KPI_CATEGORIES } from '../lib/kpiDashboard';
import { useKpiData } from '../hooks/useKpiData';

export default function KpiWidget() {
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['objectives-widget'],
    queryFn: () => base44.entities.Objective.list('-created_date', 100),
  });

  const { kpis } = useKpiData();

  // Filtra solo gli obiettivi che sono collegati ai 5 KPI
  const kpiObjectives = objectives.filter(o => 
    o.status === 'active' && Object.keys(KPI_CATEGORIES).includes(o.category)
  ).slice(0, 5);

  // Se non ci sono obiettivi KPI, mostra i primi 5 obiettivi attivi
  const activeObjectives = kpiObjectives.length > 0 ? kpiObjectives : objectives.filter(o => o.status === 'active').slice(0, 5);

  const stats = {
    total: activeObjectives.length,
    onTrack: activeObjectives.filter(o => calculateObjectiveStatus(o).status === 'on_track').length,
    atRisk: activeObjectives.filter(o => calculateObjectiveStatus(o).status === 'at_risk').length,
    offTrack: activeObjectives.filter(o => calculateObjectiveStatus(o).status === 'off_track').length,
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-slate-700" />
          Obiettivi Attivi
        </CardTitle>
        <Link to={createPageUrl('Objectives')}>
          <Button variant="ghost" size="sm">
            Vedi Tutti <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-slate-500">Caricamento...</div>
        ) : activeObjectives.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-3">Nessun obiettivo attivo</p>
            <Link to={createPageUrl('Objectives')}>
              <Button size="sm">Crea Obiettivo</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  <p className="text-xs font-medium text-emerald-700">In Linea</p>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{stats.onTrack}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  <p className="text-xs font-medium text-amber-700">A Rischio</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <p className="text-xs font-medium text-red-700">Fuori Linea</p>
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.offTrack}</p>
              </div>
            </div>

            {/* Objectives List */}
            <div className="space-y-2">
              {activeObjectives.map(obj => {
                const { status, percentage } = calculateObjectiveStatus(obj);
                const kpiData = obj.category && kpis[obj.category];
                const isKpiLinked = !!kpiData;
                
                return (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'flex items-center justify-center flex-shrink-0',
                        isKpiLinked ? 'text-lg' : 'w-2 h-2 rounded-full',
                        !isKpiLinked && (status === 'on_track' ? 'bg-emerald-500' :
                        status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500')
                      )}>
                        {isKpiLinked ? kpiData.icon : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{obj.name}</p>
                        <p className="text-xs text-slate-500">
                          {KPI_CATEGORIES[obj.category] || obj.category || 'Generale'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-bold text-slate-900">{percentage.toFixed(0)}%</p>
                      {isKpiLinked && (
                        <p className="text-xs text-slate-600 font-medium">{kpiData.formattedValue}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}