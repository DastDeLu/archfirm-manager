import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from 'recharts';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  Filter,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentUserId } from '../hooks/useCurrentUserId';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const euroFmt = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const pctFmt = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const signedEuro = (value) => `${value >= 0 ? '+' : ''}${euroFmt.format(value)}`;
const asNumber = (value) => Number(value) || 0;

function deltaPercent(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function DashboardConfronto() {
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentCalendarYear);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState('all');
  const uid = useCurrentUserId();
  const previousYear = selectedYear - 1;

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues', uid],
    queryFn: () => base44.entities.Revenue.list('-date'),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', uid],
    queryFn: () => base44.entities.Expense.list('-date'),
  });

  const { data: currentForecasts = [] } = useQuery({
    queryKey: ['forecasts', uid, selectedYear],
    queryFn: () => base44.entities.Forecast.filter({ year: selectedYear }),
  });

  const { data: previousForecasts = [] } = useQuery({
    queryKey: ['forecasts', uid, previousYear],
    queryFn: () => base44.entities.Forecast.filter({ year: previousYear }),
  });

  const visibleMonthIndexes = useMemo(() => {
    if (selectedMonth === 'all') {
      return Array.from({ length: 12 }, (_, index) => index + 1);
    }
    return [Number(selectedMonth)];
  }, [selectedMonth]);

  const tagOptions = useMemo(() => {
    const tags = [...revenues, ...expenses]
      .map((entry) => entry.tag)
      .filter((tag) => typeof tag === 'string' && tag.trim().length > 0);
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b, 'it'));
  }, [revenues, expenses]);

  const entityOptions = useMemo(() => {
    const values = [];
    [...revenues, ...expenses].forEach((entry) => {
      if (entry.project_name) {
        values.push({ value: `project:${entry.project_name}`, label: `Progetto: ${entry.project_name}` });
      }
      if (entry.client_name) {
        values.push({ value: `client:${entry.client_name}`, label: `Cliente: ${entry.client_name}` });
      }
    });

    const unique = new Map();
    values.forEach((item) => {
      if (!unique.has(item.value)) unique.set(item.value, item);
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'it'));
  }, [revenues, expenses]);

  const matchesFilters = (entry) => {
    const matchesTag = selectedTag === 'all' || entry.tag === selectedTag;
    if (!matchesTag) return false;
    if (selectedEntity === 'all') return true;

    const [kind, rawValue] = selectedEntity.split(':');
    if (kind === 'project') return entry.project_name === rawValue;
    if (kind === 'client') return entry.client_name === rawValue;
    return true;
  };

  const filteredRevenues = useMemo(
    () => revenues.filter((entry) => matchesFilters(entry)),
    [revenues, selectedTag, selectedEntity],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((entry) => matchesFilters(entry)),
    [expenses, selectedTag, selectedEntity],
  );

  const comparisonData = useMemo(() => {
    return visibleMonthIndexes.map((monthNum) => {
      const month = MONTHS[monthNum - 1];
      const currentPrefix = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
      const previousPrefix = `${previousYear}-${String(monthNum).padStart(2, '0')}`;

      const currentRevenue = filteredRevenues
        .filter((revenue) => revenue.date?.startsWith(currentPrefix))
        .reduce((sum, revenue) => sum + asNumber(revenue.amount), 0);

      const previousRevenue = filteredRevenues
        .filter((revenue) => revenue.date?.startsWith(previousPrefix))
        .reduce((sum, revenue) => sum + asNumber(revenue.amount), 0);

      const currentExpense = filteredExpenses
        .filter((expense) => expense.date?.startsWith(currentPrefix))
        .reduce((sum, expense) => sum + asNumber(expense.amount), 0);

      const previousExpense = filteredExpenses
        .filter((expense) => expense.date?.startsWith(previousPrefix))
        .reduce((sum, expense) => sum + asNumber(expense.amount), 0);

      const currentForecast = currentForecasts.find((forecast) => Number(forecast.month) === monthNum);
      const previousForecast = previousForecasts.find((forecast) => Number(forecast.month) === monthNum);

      const currentForecastNet = asNumber(currentForecast?.revenue_amount) - asNumber(currentForecast?.expense_amount);
      const previousForecastNet = asNumber(previousForecast?.revenue_amount) - asNumber(previousForecast?.expense_amount);

      const saldoCurrent = currentRevenue - currentExpense;
      const saldoPrevious = previousRevenue - previousExpense;

      return {
        month,
        monthNum,
        currentRevenue,
        previousRevenue,
        revenueDelta: currentRevenue - previousRevenue,
        currentExpense,
        previousExpense,
        expenseDelta: currentExpense - previousExpense,
        currentExpenseStack: -currentExpense,
        previousExpenseStack: -previousExpense,
        saldoCurrent,
        saldoPrevious,
        saldoDelta: saldoCurrent - saldoPrevious,
        currentForecastNet,
        previousForecastNet,
        forecastGap: saldoCurrent - currentForecastNet,
      };
    });
  }, [filteredExpenses, previousForecasts, previousYear, filteredRevenues, selectedYear, visibleMonthIndexes, currentForecasts]);

  const totals = useMemo(() => {
    return comparisonData.reduce(
      (acc, item) => ({
        currentRevenue: acc.currentRevenue + item.currentRevenue,
        previousRevenue: acc.previousRevenue + item.previousRevenue,
        currentExpense: acc.currentExpense + item.currentExpense,
        previousExpense: acc.previousExpense + item.previousExpense,
        saldoCurrent: acc.saldoCurrent + item.saldoCurrent,
        saldoPrevious: acc.saldoPrevious + item.saldoPrevious,
        currentForecastNet: acc.currentForecastNet + item.currentForecastNet,
      }),
      {
        currentRevenue: 0,
        previousRevenue: 0,
        currentExpense: 0,
        previousExpense: 0,
        saldoCurrent: 0,
        saldoPrevious: 0,
        currentForecastNet: 0,
      },
    );
  }, [comparisonData]);

  const revenueDelta = totals.currentRevenue - totals.previousRevenue;
  const expenseDelta = totals.currentExpense - totals.previousExpense;
  const saldoDelta = totals.saldoCurrent - totals.saldoPrevious;
  const forecastGap = totals.saldoCurrent - totals.currentForecastNet;

  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, index) => currentCalendarYear - 3 + index),
    [currentCalendarYear],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Confronto"
        description={`Confronto ${selectedYear} vs ${previousYear} con singola sorgente dati`}
      />

      <Card className="border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Control room</p>
              <h2 className="mt-1 text-2xl font-semibold">Confronto finanziario anno su anno</h2>
              <p className="mt-2 text-sm text-slate-300">
                Tutte le metriche derivano da Ricavi/Spese via `date`, evitando inconsistenze tra pagine.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Calendar className="h-3.5 w-3.5" />
                  Anno di analisi
                </p>
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-[180px] border-slate-600 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Filter className="h-3.5 w-3.5" />
                  Mese
                </p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] border-slate-600 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i mesi</SelectItem>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Filter className="h-3.5 w-3.5" />
                  Tag
                </p>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-[180px] border-slate-600 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tag</SelectItem>
                    {tagOptions.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs text-slate-300">
                  <Filter className="h-3.5 w-3.5" />
                  Progetto/Cliente
                </p>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="w-[180px] border-slate-600 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {entityOptions.map((entity) => (
                      <SelectItem key={entity.value} value={entity.value}>
                        {entity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={cn('border', revenueDelta >= 0 ? 'border-emerald-200' : 'border-red-200')}>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Ricavi</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{euroFmt.format(totals.currentRevenue)}</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {revenueDelta >= 0 ? (
                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(revenueDelta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {signedEuro(revenueDelta)} ({pctFmt(deltaPercent(totals.currentRevenue, totals.previousRevenue))})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border', expenseDelta <= 0 ? 'border-emerald-200' : 'border-red-200')}>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Spese</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{euroFmt.format(totals.currentExpense)}</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {expenseDelta <= 0 ? (
                <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(expenseDelta <= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {signedEuro(expenseDelta)} ({pctFmt(deltaPercent(totals.currentExpense, totals.previousExpense))})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border', saldoDelta >= 0 ? 'border-emerald-200' : 'border-red-200')}>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Saldo netto</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{euroFmt.format(totals.saldoCurrent)}</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              {saldoDelta >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(saldoDelta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {signedEuro(saldoDelta)} ({pctFmt(deltaPercent(totals.saldoCurrent, totals.saldoPrevious))})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border', forecastGap >= 0 ? 'border-emerald-200' : 'border-amber-200')}>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Scostamento da forecast</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{signedEuro(forecastGap)}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <Badge variant="secondary" className="font-medium">
                Forecast netto: {euroFmt.format(totals.currentForecastNet)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trend mensile stacked: ricavi/spese e saldo delta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 12, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => euroFmt.format(value)} />
                <Tooltip
                  formatter={(value) => euroFmt.format(asNumber(value))}
                  contentStyle={{ borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
                <Legend />
                <Bar dataKey="currentRevenue" stackId="current" name={`Ricavi ${selectedYear}`} fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="currentExpenseStack" stackId="current" name={`Spese ${selectedYear}`} fill="#dc2626" radius={[0, 0, 6, 6]} />
                <Bar dataKey="previousRevenue" stackId="previous" name={`Ricavi ${previousYear}`} fill="#2dd4bf" radius={[6, 6, 0, 0]} />
                <Bar dataKey="previousExpenseStack" stackId="previous" name={`Spese ${previousYear}`} fill="#f87171" radius={[0, 0, 6, 6]} />
                <Line type="monotone" dataKey="saldoDelta" name="Saldo delta" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dettaglio confronto mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mese</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ricavi {selectedYear}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ricavi {previousYear}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Spese {selectedYear}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Spese {previousYear}</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo Delta</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast Gap</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item) => (
                  <tr key={item.monthNum} className="border-b">
                    <td className="py-3 text-sm font-medium text-slate-900">{item.month}</td>
                    <td className="py-3 text-sm text-emerald-700">{euroFmt.format(item.currentRevenue)}</td>
                    <td className="py-3 text-sm text-slate-600">{euroFmt.format(item.previousRevenue)}</td>
                    <td className="py-3 text-sm text-red-700">{euroFmt.format(item.currentExpense)}</td>
                    <td className="py-3 text-sm text-slate-600">{euroFmt.format(item.previousExpense)}</td>
                    <td
                      className={cn(
                        'py-3 text-sm font-semibold',
                        item.saldoDelta >= 0 ? 'text-emerald-700' : 'text-red-700',
                      )}
                    >
                      {signedEuro(item.saldoDelta)}
                    </td>
                    <td
                      className={cn(
                        'py-3 text-sm font-semibold',
                        item.forecastGap >= 0 ? 'text-emerald-700' : 'text-amber-700',
                      )}
                    >
                      {signedEuro(item.forecastGap)}
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
