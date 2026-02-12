import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function DashboardConfronto() {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const { data: currentRevenues = [] } = useQuery({
    queryKey: ['revenues', currentYear],
    queryFn: () => base44.entities.Revenue.filter({ year: currentYear }),
  });

  const { data: previousRevenues = [] } = useQuery({
    queryKey: ['revenues', previousYear],
    queryFn: () => base44.entities.Revenue.filter({ year: previousYear }),
  });

  const { data: currentExpenses = [] } = useQuery({
    queryKey: ['expenses', currentYear],
    queryFn: () => base44.entities.Expense.filter({ year: currentYear }),
  });

  const { data: previousExpenses = [] } = useQuery({
    queryKey: ['expenses', previousYear],
    queryFn: () => base44.entities.Expense.filter({ year: previousYear }),
  });

  const { data: currentForecasts = [] } = useQuery({
    queryKey: ['forecasts', currentYear],
    queryFn: () => base44.entities.Forecast.filter({ year: currentYear }),
  });

  const { data: previousForecasts = [] } = useQuery({
    queryKey: ['forecasts', previousYear],
    queryFn: () => base44.entities.Forecast.filter({ year: previousYear }),
  });

  const comparisonData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthNum = idx + 1;
      const monthKey = String(monthNum).padStart(2, '0');

      // Current year
      const currentRevenue = currentRevenues
        .filter(r => r.date?.includes(`-${monthKey}-`))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const currentExpense = currentExpenses
        .filter(e => e.date?.includes(`-${monthKey}-`))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const currentForecast = currentForecasts.find(f => f.month === monthNum);

      // Previous year
      const previousRevenue = previousRevenues
        .filter(r => r.date?.includes(`-${monthKey}-`))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const previousExpense = previousExpenses
        .filter(e => e.date?.includes(`-${monthKey}-`))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const previousForecast = previousForecasts.find(f => f.month === monthNum);

      // Deltas
      const revenueDelta = currentRevenue - previousRevenue;
      const expenseDelta = currentExpense - previousExpense;
      const saldoCurrentYear = currentRevenue - currentExpense;
      const saldoPreviousYear = previousRevenue - previousExpense;
      const saldoDelta = saldoCurrentYear - saldoPreviousYear;

      return {
        month,
        currentRevenue,
        previousRevenue,
        revenueDelta,
        revenueDeltaPercent: previousRevenue > 0 ? ((revenueDelta / previousRevenue) * 100).toFixed(1) : 0,
        currentExpense,
        previousExpense,
        expenseDelta,
        expenseDeltaPercent: previousExpense > 0 ? ((expenseDelta / previousExpense) * 100).toFixed(1) : 0,
        saldoCurrentYear,
        saldoPreviousYear,
        saldoDelta,
        saldoDeltaPercent: saldoPreviousYear !== 0 ? ((saldoDelta / Math.abs(saldoPreviousYear)) * 100).toFixed(1) : 0,
      };
    });
  }, [currentRevenues, previousRevenues, currentExpenses, previousExpenses, currentForecasts, previousForecasts]);

  const totals = useMemo(() => {
    return comparisonData.reduce((acc, item) => ({
      currentRevenue: acc.currentRevenue + item.currentRevenue,
      previousRevenue: acc.previousRevenue + item.previousRevenue,
      currentExpense: acc.currentExpense + item.currentExpense,
      previousExpense: acc.previousExpense + item.previousExpense,
      saldoCurrentYear: acc.saldoCurrentYear + item.saldoCurrentYear,
      saldoPreviousYear: acc.saldoPreviousYear + item.saldoPreviousYear,
    }), { currentRevenue: 0, previousRevenue: 0, currentExpense: 0, previousExpense: 0, saldoCurrentYear: 0, saldoPreviousYear: 0 });
  }, [comparisonData]);

  const totalRevenueDelta = totals.currentRevenue - totals.previousRevenue;
  const totalRevenueDeltaPercent = totals.previousRevenue > 0 ? ((totalRevenueDelta / totals.previousRevenue) * 100).toFixed(1) : 0;
  
  const totalExpenseDelta = totals.currentExpense - totals.previousExpense;
  const totalExpenseDeltaPercent = totals.previousExpense > 0 ? ((totalExpenseDelta / totals.previousExpense) * 100).toFixed(1) : 0;
  
  const totalSaldoDelta = totals.saldoCurrentYear - totals.saldoPreviousYear;
  const totalSaldoDeltaPercent = totals.saldoPreviousYear !== 0 ? ((totalSaldoDelta / Math.abs(totals.saldoPreviousYear)) * 100).toFixed(1) : 0;

  return (
    <div>
      <PageHeader 
        title="Dashboard Confronto" 
        description={`Confronto Anno su Anno: ${currentYear} vs ${previousYear}`}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className={totalRevenueDelta >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <TrendingUp className="h-4 w-4" />
              Incassi YoY
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{currentYear}</p>
                <p className="text-xl font-bold text-slate-900">
                  €{totals.currentRevenue.toLocaleString('it-IT')}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {totalRevenueDelta >= 0 ? (
                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn("text-lg font-semibold", totalRevenueDelta >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {totalRevenueDelta >= 0 ? '+' : ''}€{totalRevenueDelta.toLocaleString('it-IT')}
                  </span>
                </div>
                <p className={cn("text-xs", totalRevenueDelta >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {totalRevenueDelta >= 0 ? '+' : ''}{totalRevenueDeltaPercent}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalExpenseDelta <= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <TrendingDown className="h-4 w-4" />
              Spese YoY
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{currentYear}</p>
                <p className="text-xl font-bold text-slate-900">
                  €{totals.currentExpense.toLocaleString('it-IT')}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {totalExpenseDelta <= 0 ? (
                    <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn("text-lg font-semibold", totalExpenseDelta <= 0 ? "text-emerald-600" : "text-red-600")}>
                    {totalExpenseDelta >= 0 ? '+' : ''}€{totalExpenseDelta.toLocaleString('it-IT')}
                  </span>
                </div>
                <p className={cn("text-xs", totalExpenseDelta <= 0 ? "text-emerald-600" : "text-red-600")}>
                  {totalExpenseDelta >= 0 ? '+' : ''}{totalExpenseDeltaPercent}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalSaldoDelta >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Calendar className="h-4 w-4" />
              Saldo YoY
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{currentYear}</p>
                <p className="text-xl font-bold text-slate-900">
                  €{totals.saldoCurrentYear.toLocaleString('it-IT')}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  {totalSaldoDelta >= 0 ? (
                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn("text-lg font-semibold", totalSaldoDelta >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {totalSaldoDelta >= 0 ? '+' : ''}€{totalSaldoDelta.toLocaleString('it-IT')}
                  </span>
                </div>
                <p className={cn("text-xs", totalSaldoDelta >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {totalSaldoDelta >= 0 ? '+' : ''}{totalSaldoDeltaPercent}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Confronto Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
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
                <Bar dataKey="currentRevenue" name={`Ricavi ${currentYear}`} fill="#10b981" />
                <Bar dataKey="previousRevenue" name={`Ricavi ${previousYear}`} fill="#10b981" opacity={0.4} />
                <Bar dataKey="currentExpense" name={`Spese ${currentYear}`} fill="#ef4444" />
                <Bar dataKey="previousExpense" name={`Spese ${previousYear}`} fill="#ef4444" opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-sm font-semibold text-slate-600">Mese</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Incassi {currentYear}</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Incassi {previousYear}</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Delta</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Spese {currentYear}</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Spese {previousYear}</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Delta</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Saldo Delta</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 text-sm font-medium text-slate-900">{item.month}</td>
                    <td className="py-3 text-sm text-emerald-600">€{item.currentRevenue.toLocaleString('it-IT')}</td>
                    <td className="py-3 text-sm text-slate-500">€{item.previousRevenue.toLocaleString('it-IT')}</td>
                    <td className={cn("py-3 text-sm font-medium", item.revenueDelta >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {item.revenueDelta >= 0 ? '+' : ''}€{item.revenueDelta.toLocaleString('it-IT')} ({item.revenueDeltaPercent}%)
                    </td>
                    <td className="py-3 text-sm text-red-600">€{item.currentExpense.toLocaleString('it-IT')}</td>
                    <td className="py-3 text-sm text-slate-500">€{item.previousExpense.toLocaleString('it-IT')}</td>
                    <td className={cn("py-3 text-sm font-medium", item.expenseDelta <= 0 ? "text-emerald-600" : "text-red-600")}>
                      {item.expenseDelta >= 0 ? '+' : ''}€{item.expenseDelta.toLocaleString('it-IT')} ({item.expenseDeltaPercent}%)
                    </td>
                    <td className={cn("py-3 text-sm font-semibold", item.saldoDelta >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {item.saldoDelta >= 0 ? '+' : ''}€{item.saldoDelta.toLocaleString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}