import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Target, TrendingUp } from 'lucide-react';
import { calculateObjectiveStatus, getStatusColor } from '../objectives/objectiveLogic';

export default function ControlDashboardSidebarWidget() {
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['objectives-sidebar'],
    queryFn: () => base44.entities.Objective.list('-created_date', 5),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-b border-slate-200/60">
        <div className="text-xs text-slate-500">Loading...</div>
      </div>
    );
  }

  const activeObjectives = objectives.filter(o => o.status === 'active').slice(0, 5);

  return (
    <div className="px-4 py-3 border-b border-slate-200/60">
      <Link 
        to={createPageUrl('Objectives')}
        className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
      >
        <Target className="h-4 w-4" />
        <span>Obiettivi Attivi</span>
      </Link>
      <div className="space-y-2">
        {activeObjectives.length === 0 ? (
          <div className="text-xs text-slate-400 italic">Nessun obiettivo attivo</div>
        ) : (
          activeObjectives.map(obj => {
            const { status, percentage } = calculateObjectiveStatus(obj);
            const colors = getStatusColor(status);
            return (
              <div key={obj.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', 
                    status === 'on_track' ? 'bg-emerald-500' : 
                    status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                  )} />
                  <span className="text-slate-600 truncate">{obj.name}</span>
                </div>
                <span className="font-medium text-slate-900 ml-2">{percentage.toFixed(0)}%</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}