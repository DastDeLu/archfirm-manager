import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Receipt, Building2, FolderKanban, 
  ArrowRight, AlertCircle, Calendar, Euro, Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatCard from '../components/ui/StatCard';
import CashPosition from '../components/treasury/CashPosition';
import { format, startOfMonth, endOfMonth, isAfter, parseISO } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { data: revenues = [], isLoading: loadingRevenues } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list(),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: fees = [], isLoading: loadingFees } = useQuery({
    queryKey: ['fees'],
    queryFn: () => base44.entities.Fee.list(),
  });

  const { data: installments = [], isLoading: loadingInstallments } = useQuery({
    queryKey: ['installments'],
    queryFn: () => base44.entities.Installment.list(),
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
  });

  const loading = loadingRevenues || loadingExpenses || loadingFees || loadingProjects;

  // Calculate totals
  const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netIncome = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0;

  // Overdue fees
  const today = new Date();
  const overdueInstallments = installments.filter(i => 
    i.status !== 'paid' && i.due_date && isAfter(today, parseISO(i.due_date))
  );

  // Monthly data for chart
  const monthlyData = React.useMemo(() => {
    const months = {};
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      months[monthKey] = { month: format(new Date(currentYear, i), 'MMM'), revenue: 0, expense: 0 };
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

    return Object.values(months);
  }, [revenues, expenses]);

  // Revenue by tag
  const revenueByTag = React.useMemo(() => {
    const tags = {};
    revenues.forEach(r => {
      const tag = r.tag || 'Other';
      tags[tag] = (tags[tag] || 0) + (r.amount || 0);
    });
    return Object.entries(tags).map(([name, value]) => ({ name, value }));
  }, [revenues]);

  // Expense by tag
  const expenseByTag = React.useMemo(() => {
    const tags = {};
    expenses.forEach(e => {
      const tag = e.tag || 'Other';
      tags[tag] = (tags[tag] || 0) + (e.amount || 0);
    });
    return Object.entries(tags).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  // Conversion rate calculation
  const conversionStats = React.useMemo(() => {
    const won = quotes.filter(q => q.status === 'won').length;
    const lost = quotes.filter(q => q.status === 'lost').length;
    const rate = (won + lost) > 0 ? ((won / (won + lost)) * 100).toFixed(1) : 0;
    return { won, lost, rate };
  }, [quotes]);

  return (
    <div className="space-y-6">
      {/* Cash Position */}
      <CashPosition />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ricavi Totali"
          value={`€${totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          iconClassName="bg-emerald-50"
          trend="up"
          trendValue="Anno in corso"
        />
        <StatCard
          title="Costi Totali"
          value={`€${totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          iconClassName="bg-red-50"
        />
        <StatCard
          title="Utile Netto"
          value={`€${netIncome.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
          icon={Euro}
          iconClassName={netIncome >= 0 ? "bg-blue-50" : "bg-red-50"}
          valueClassName={netIncome >= 0 ? "text-blue-600" : "text-red-600"}
        />
        <StatCard
          title="Margine di Profitto"
          value={`${margin}%`}
          icon={Percent}
          iconClassName="bg-purple-50"
        />
      </div>

      {/* Conversion Rate Card */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          <StatCard
            title="Tasso Conversione Preventivi"
            value={`${conversionStats.rate}%`}
            icon={TrendingUp}
            iconClassName="bg-indigo-50"
            trend={conversionStats.won > conversionStats.lost ? 'up' : undefined}
            trendValue={`${conversionStats.won}/${conversionStats.won + conversionStats.lost} vinti`}
          />
        </div>
      )}

      {/* Alerts */}
      {overdueInstallments.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900">
                  {overdueInstallments.length} Rata{overdueInstallments.length > 1 ? 'e' : ''} Scaduta{overdueInstallments.length > 1 ? 'e' : ''}
                </p>
                <p className="text-sm text-red-700">
                  Totale: €{overdueInstallments.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString('it-IT')}
                </p>
              </div>
            </div>
            <Link to={createPageUrl('Fees')}>
              <Button variant="outline" size="sm" className="text-red-700 border-red-200 hover:bg-red-100">
                Vedi Dettagli <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ricavi vs Costi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ricavi per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {revenueByTag.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByTag}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {revenueByTag.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT')}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm">Nessun dato sui ricavi</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {revenueByTag.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to={createPageUrl('Clients')}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeClients}</p>
                <p className="text-sm text-slate-500">Clienti Attivi</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Projects')}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <FolderKanban className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeProjects}</p>
                <p className="text-sm text-slate-500">Progetti Attivi</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                €{quotes.filter(q => q.status === 'won').reduce((sum, q) => sum + (q.amount || 0), 0).toLocaleString('it-IT')}
              </p>
              <p className="text-sm text-slate-500">Preventivi Vinti</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Ricavi Recenti</CardTitle>
            <Link to={createPageUrl('Revenues')}>
              <Button variant="ghost" size="sm">Vedi Tutti</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenues.slice(0, 5).map(revenue => (
                <div key={revenue.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{revenue.description || 'Revenue'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{revenue.tag}</Badge>
                      <span className="text-xs text-slate-500">{revenue.date}</span>
                    </div>
                  </div>
                  <p className="font-semibold text-emerald-600">
                    +€{(revenue.amount || 0).toLocaleString('it-IT')}
                  </p>
                </div>
              ))}
              {revenues.length === 0 && (
                <p className="text-center text-slate-500 py-4">Nessun ricavo ancora</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Costi Recenti</CardTitle>
            <Link to={createPageUrl('Expenses')}>
              <Button variant="ghost" size="sm">Vedi Tutti</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.slice(0, 5).map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{expense.description || 'Expense'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{expense.tag}</Badge>
                      <span className="text-xs text-slate-500">{expense.date}</span>
                    </div>
                  </div>
                  <p className="font-semibold text-red-600">
                    -€{(expense.amount || 0).toLocaleString('it-IT')}
                  </p>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-center text-slate-500 py-4">Nessun costo ancora</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}