import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Percent, Euro, Target, BarChart3, PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CashFlowLineChart from '../components/charts/CashFlowLineChart';
import RevExpBarChart from '../components/charts/RevExpBarChart';

export default function Earnings() {
  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: forecasts = [] } = useQuery({
    queryKey: ['forecasts'],
    queryFn: () => base44.entities.Forecast.list(),
  });

  const { data: bankCashEntries = [] } = useQuery({
    queryKey: ['bankCash'],
    queryFn: () => base44.entities.BankCash.list(),
  });

  const { data: pettyCashEntries = [] } = useQuery({
    queryKey: ['pettyCash'],
    queryFn: () => base44.entities.PettyCash.list(),
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalRevenue - totalExpense;
    
    const roi = totalExpense > 0 ? ((netIncome / totalExpense) * 100).toFixed(1) : 0;
    const margin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0;
    
    const currentYear = new Date().getFullYear();
    const yearForecasts = forecasts.filter(f => f.year === currentYear);
    const baselineRevenue = yearForecasts.reduce((sum, f) => sum + (f.revenue_amount || 0), 0);
    const baselineExpense = yearForecasts.reduce((sum, f) => sum + (f.expense_amount || 0), 0);
    
    const revenueVariance = baselineRevenue > 0 
      ? (((totalRevenue - baselineRevenue) / baselineRevenue) * 100).toFixed(1)
      : 0;
    const expenseVariance = baselineExpense > 0
      ? (((totalExpense - baselineExpense) / baselineExpense) * 100).toFixed(1)
      : 0;

    return {
      totalRevenue,
      totalExpense,
      netIncome,
      roi,
      margin,
      baselineRevenue,
      baselineExpense,
      revenueVariance,
      expenseVariance
    };
  }, [revenues, expenses, forecasts]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months = {};
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthName = new Date(currentYear, i).toLocaleString('en', { month: 'short' });
      months[monthKey] = { 
        month: monthName, 
        revenue: 0, 
        expense: 0, 
        netIncome: 0,
        cumulativeIncome: 0
      };
    }

    revenues.forEach(r => {
      if (r.date) {
        const key = r.date.substring(0, 7);
        if (months[key]) months[key].revenue += r.amount || 0;
      }
    });

    expenses.forEach(e => {
      if (e.date) {
        const key = e.date.substring(0, 7);
        if (months[key]) months[key].expense += e.amount || 0;
      }
    });

    let cumulative = 0;
    return Object.values(months).map(item => {
      item.netIncome = item.revenue - item.expense;
      cumulative += item.netIncome;
      item.cumulativeIncome = cumulative;
      return item;
    });
  }, [revenues, expenses]);

  // Revenue breakdown by tag
  const revenueByTag = useMemo(() => {
    const tags = {};
    revenues.forEach(r => {
      const tag = r.tag || 'Other';
      tags[tag] = (tags[tag] || 0) + (r.amount || 0);
    });
    return Object.entries(tags).map(([name, value]) => ({ name, value }));
  }, [revenues]);

  // Expense breakdown by tag
  const expenseByTag = useMemo(() => {
    const tags = {};
    expenses.forEach(e => {
      const tag = e.tag || 'Other';
      tags[tag] = (tags[tag] || 0) + (e.amount || 0);
    });
    return Object.entries(tags).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  return (
    <div>
      <PageHeader 
        title="Earnings & KPIs" 
        description="Financial performance metrics and analysis"
      />

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`€${kpis.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          iconClassName="bg-emerald-50"
          trend={parseFloat(kpis.revenueVariance) >= 0 ? 'up' : 'down'}
          trendValue={`${kpis.revenueVariance}% vs baseline`}
        />
        <StatCard
          title="Total Expenses"
          value={`€${kpis.totalExpense.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          iconClassName="bg-red-50"
          trend={parseFloat(kpis.expenseVariance) <= 0 ? 'up' : 'down'}
          trendValue={`${kpis.expenseVariance}% vs baseline`}
        />
        <StatCard
          title="Net Income"
          value={`€${kpis.netIncome.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
          icon={Euro}
          iconClassName={kpis.netIncome >= 0 ? "bg-blue-50" : "bg-red-50"}
          valueClassName={kpis.netIncome >= 0 ? "text-blue-600" : "text-red-600"}
        />
        <StatCard
          title="Profit Margin"
          value={`${kpis.margin}%`}
          icon={Percent}
          iconClassName="bg-purple-50"
        />
      </div>

      {/* Advanced KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">ROI</p>
                <p className={cn(
                  "text-2xl font-bold",
                  parseFloat(kpis.roi) >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {kpis.roi}%
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Return on Investment = (Net Income / Total Expenses) × 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Baseline Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  €{kpis.baselineRevenue.toLocaleString('it-IT')}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Total forecasted revenue for the year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <BarChart3 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Baseline Expenses</p>
                <p className="text-2xl font-bold text-slate-900">
                  €{kpis.baselineExpense.toLocaleString('it-IT')}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Total forecasted expenses for the year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CashFlowLineChart 
          bankCashEntries={bankCashEntries}
          pettyCashEntries={pettyCashEntries}
          revenues={revenues}
          expenses={expenses}
        />
        <RevExpBarChart 
          revenues={revenues}
          expenses={expenses}
        />
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar 
                    dataKey="netIncome" 
                    name="Net Income"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Cumulative Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeIncome" 
                    name="Cumulative"
                    stroke="#8b5cf6" 
                    fill="url(#colorCumulative)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByTag} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={60} />
                  <Tooltip 
                    formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" name="Amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByTag} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={60} />
                  <Tooltip 
                    formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" name="Amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}