import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function YoYComparison({ year = new Date().getFullYear() }) {
  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const comparisonData = useMemo(() => {
    const currentYear = year;
    const previousYear = year - 1;

    return MONTHS.map((month, idx) => {
      const monthNum = idx + 1;
      const currentKey = `${currentYear}-${String(monthNum).padStart(2, '0')}`;
      const previousKey = `${previousYear}-${String(monthNum).padStart(2, '0')}`;

      const currentRevenue = revenues
        .filter(r => r.date?.startsWith(currentKey))
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const previousRevenue = revenues
        .filter(r => r.date?.startsWith(previousKey))
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const currentExpense = expenses
        .filter(e => e.date?.startsWith(currentKey))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const previousExpense = expenses
        .filter(e => e.date?.startsWith(previousKey))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        month,
        currentRevenue,
        previousRevenue,
        currentExpense,
        previousExpense,
        currentNet: currentRevenue - currentExpense,
        previousNet: previousRevenue - previousExpense
      };
    });
  }, [revenues, expenses, year]);

  // Calculate totals
  const totals = useMemo(() => {
    return comparisonData.reduce((acc, item) => ({
      currentRevenue: acc.currentRevenue + item.currentRevenue,
      previousRevenue: acc.previousRevenue + item.previousRevenue,
      currentExpense: acc.currentExpense + item.currentExpense,
      previousExpense: acc.previousExpense + item.previousExpense,
      currentNet: acc.currentNet + item.currentNet,
      previousNet: acc.previousNet + item.previousNet,
    }), { 
      currentRevenue: 0, 
      previousRevenue: 0, 
      currentExpense: 0, 
      previousExpense: 0,
      currentNet: 0,
      previousNet: 0
    });
  }, [comparisonData]);

  const revenueChange = totals.previousRevenue > 0 
    ? ((totals.currentRevenue - totals.previousRevenue) / totals.previousRevenue * 100).toFixed(1)
    : 0;

  const expenseChange = totals.previousExpense > 0
    ? ((totals.currentExpense - totals.previousExpense) / totals.previousExpense * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Ricavi Anno su Anno</p>
              <Badge className={cn(
                revenueChange >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {revenueChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {revenueChange}%
              </Badge>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold text-slate-900">
                €{totals.currentRevenue.toLocaleString('it-IT')}
              </p>
              <p className="text-sm text-slate-500">
                vs €{totals.previousRevenue.toLocaleString('it-IT')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Costi Anno su Anno</p>
              <Badge className={cn(
                expenseChange <= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {expenseChange <= 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                {Math.abs(expenseChange)}%
              </Badge>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold text-slate-900">
                €{totals.currentExpense.toLocaleString('it-IT')}
              </p>
              <p className="text-sm text-slate-500">
                vs €{totals.previousExpense.toLocaleString('it-IT')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Confronto Mensile: {year} vs {year - 1}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                <Tooltip 
                  formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="previousRevenue" name={`Ricavi ${year - 1}`} fill="#94a3b8" />
                <Bar dataKey="currentRevenue" name={`Ricavi ${year}`} fill="#10b981" />
                <Bar dataKey="previousExpense" name={`Costi ${year - 1}`} fill="#fca5a5" />
                <Bar dataKey="currentExpense" name={`Costi ${year}`} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}