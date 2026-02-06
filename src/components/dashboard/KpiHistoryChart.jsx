import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useKpiHistory } from '../hooks/useKpiData';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KpiHistoryChart({ kpiId, kpiLabel }) {
  const { data: history = [], isLoading } = useKpiHistory(kpiId, 12);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center text-slate-500">
            Caricamento storico...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex items-center justify-center text-slate-500">
            Nessuno storico disponibile
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = history.map(snapshot => ({
    name: `${snapshot.month}/${snapshot.year}`,
    value: snapshot.value,
    targetOk: snapshot.target_ok,
    targetAttention: snapshot.target_attention,
    status: snapshot.status,
  }));

  const latestValue = history[history.length - 1]?.value;
  const previousValue = history[history.length - 2]?.value;
  const trend = previousValue ? ((latestValue - previousValue) / previousValue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-base">{kpiLabel} - Andamento Storico</span>
          {trend !== 0 && (
            <div className={cn(
              "flex items-center gap-1 text-sm",
              trend > 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <ReferenceLine 
              y={chartData[0]?.targetOk} 
              stroke="#10b981" 
              strokeDasharray="5 5"
              label={{ value: 'OK', position: 'right', fontSize: 10 }}
            />
            <ReferenceLine 
              y={chartData[0]?.targetAttention} 
              stroke="#f59e0b" 
              strokeDasharray="5 5"
              label={{ value: 'Attention', position: 'right', fontSize: 10 }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}