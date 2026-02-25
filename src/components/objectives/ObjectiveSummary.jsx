import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, AlertTriangle, AlertCircle } from 'lucide-react';
import { calculateObjectiveStatus } from './objectiveLogic';

export default function ObjectiveSummary({ objectives }) {
  const stats = React.useMemo(() => {
    const statusCounts = {
      total: objectives.filter(o => o.status === 'active').length,
      on_track: 0,
      at_risk: 0,
      off_track: 0
    };

    objectives
      .filter(o => o.status === 'active')
      .forEach(obj => {
        const { status } = calculateObjectiveStatus(obj);
        statusCounts[status]++;
      });

    return statusCounts;
  }, [objectives]);

  const cards = [
    {
      label: 'Obiettivi Totali',
      value: stats.total,
      icon: Target,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'In Linea',
      value: stats.on_track,
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'A Rischio',
      value: stats.at_risk,
      icon: AlertTriangle,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Fuori Rotta',
      value: stats.off_track,
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}