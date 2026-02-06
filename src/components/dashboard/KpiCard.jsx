import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  ok: 'bg-emerald-500',
  attention: 'bg-amber-500',
  critical: 'bg-red-500',
};

const statusBorders = {
  ok: 'border-emerald-200',
  attention: 'border-amber-200',
  critical: 'border-red-200',
};

export default function KpiCard({ kpi }) {
  return (
    <Card className={cn('border-l-4 transition-all hover:shadow-md', statusBorders[kpi.status])}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="text-slate-700">{kpi.label}</span>
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', statusColors[kpi.status])} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{kpi.formula}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-3xl font-bold text-slate-900">{kpi.formattedValue}</p>
          <p className="text-xs text-slate-500">{kpi.target}</p>
        </div>
      </CardContent>
    </Card>
  );
}