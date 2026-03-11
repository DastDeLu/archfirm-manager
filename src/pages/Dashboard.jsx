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
  ArrowRight, AlertCircle, Calendar, Euro, Percent, AlertTriangle, CheckCircle
} from 'lucide-react';
import { calculateCashForecast } from '../components/utils/cashForecast.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import StatCard from '../components/ui/StatCard';
import CashPosition from '../components/treasury/CashPosition';
import FeesWidget from '../components/dashboard/FeesWidget';
import KpiWidget from '../components/dashboard/KpiWidget';
import { format, startOfMonth, endOfMonth, isAfter, parseISO } from 'date-fns';
import { formatCurrency, tickCurrency } from '../components/lib/formatters';
import { it } from 'date-fns/locale';
import { useCustomTags } from '../components/hooks/useCustomTags';
import { useChartTagFilter } from '../components/hooks/useChartTagFilter';

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

  const { data: marketingBudgets = [] } = useQuery({
    queryKey: ['marketing'],
    queryFn: () => base44.entities.MarketingBudget.list(),
  });

  const { tagColorMap } = useCustomTags();
  // Filtro tag per i grafici (configurabile in Impostazioni › Generale)
  const { excludedTags } = useChartTagFilter();
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

  // Monthly data for chart – rispetta il filtro tag grafici
  const monthlyData = React.useMemo(() => {
    const months = {};
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      months[monthKey] = { month: format(new Date(currentYear, i), 'MMM', { locale: it }), revenue: 0, expense: 0 };
    }

    revenues.filter(r => !excludedTags.includes(r.tag)).forEach(r => {
      if (r.date) {
        const key = r.date.substring(0, 7);
        if (months[key]) months[key].revenue += r.amount || 0;
      }
    });

    expenses.filter(e => !excludedTags.includes(e.tag)).forEach(e => {
      if (e.date) {
        const key = e.date.substring(0, 7);
        if (months[key]) months[key].expense += e.amount || 0;
      }
    });

    return Object.values(months);
  }, [revenues, expenses, excludedTags]);

  // Revenue by tag – filtra i tag esclusi dai grafici
  const revenueByTag = React.useMemo(() => {
    const tags = {};
    revenues.filter(r => !excludedTags.includes(r.tag)).forEach(r => {
      const tag = r.tag || 'Other';
      tags[tag] = (tags[tag] || 0) + (r.amount || 0);
    });
    return Object.entries(tags).map(([name, value]) => ({ name, value }));
  }, [revenues, excludedTags]);

  // Expense by tag – filtra i tag esclusi dai grafici
  const expenseByTag = React.useMemo(() => {
    const tags = {};
    expenses.filter(e => !excludedTags.includes(e.tag)).forEach(e => {
      const tag = e.tag || 'Other';
      tags[tag] = (tags[tag] || 0) + (e.amount || 0);
    });
    return Object.entries(tags).map(([name, value]) => ({ name, value }));
  }, [expenses, excludedTags]);

  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  // Conversion rate calculation
  const conversionStats = React.useMemo(() => {
    const won = quotes.filter(q => q.status === 'won').length;
    const lost = quotes.filter(q => q.status === 'lost').length;
    const rate = (won + lost) > 0 ? ((won / (won + lost)) * 100).toFixed(1) : 0;
    return { won, lost, rate };
  }, [quotes]);

  // Calculate cash forecast + marketing stats
  const cashForecastData = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const previousYear = currentYear - 1;
    
    const ytdRevenues = revenues.filter(r => r.date?.startsWith(String(currentYear)));
    const ytdExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)));
    const cfIncassiYTD = ytdRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const cfSpeseYTD = ytdExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const riporti = installments
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    const previousYearRevenues = revenues.filter(r => r.date?.startsWith(String(previousYear)));
    const baseAnnoPrecedente = previousYearRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const cassaAttuale = totalRevenue - totalExpenses;
    
    const forecast = calculateCashForecast({
      cassaAttuale,
      riporti,
      percentualeIncasso: 0.70,
      baseAnnoPrecedente,
      growthRate: 0.35,
      speseAnnuePreviste: 117000,
      cfIncassiYTD,
      cfSpeseYTD,
      meseCorrente: currentMonth
    });

    // Calculate marketing stats
    const totalSpent = marketingBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
    const conversionsByChannel = marketingBudgets.reduce((acc, item) => {
      const channel = item.channel || 'Non specificato';
      if (!acc[channel]) {
        acc[channel] = { conversions: 0, spent: 0, revenue: 0 };
      }
      acc[channel].conversions += item.conversions || 0;
      acc[channel].spent += item.spent || 0;
      return acc;
    }, {});

    // Link revenues to channels
    revenues.forEach(rev => {
      const desc = rev.description || '';
      Object.keys(conversionsByChannel).forEach(channel => {
        if (desc.toLowerCase().includes(channel.toLowerCase())) {
          conversionsByChannel[channel].revenue += rev.amount || 0;
        }
      });
    });

    const channelStats = Object.entries(conversionsByChannel).map(([channel, data]) => ({
      channel,
      conversions: data.conversions,
      spent: data.spent,
      revenue: data.revenue,
      roi: data.spent > 0 ? ((data.revenue - data.spent) / data.spent) * 100 : 0
    }));

    channelStats.sort((a, b) => b.conversions - a.conversions);
    const topChannelData = channelStats.length > 0 ? channelStats[0] : null;
    
    return {
      ...forecast,
      marketingROI: topChannelData?.roi || 0,
      topChannel: topChannelData?.channel || null,
      topChannelConversions: topChannelData?.conversions || 0
    };
  }, [revenues, expenses, installments, totalRevenue, totalExpenses, marketingBudgets]);

  return (
    <div className="space-y-6">
      {/* Cash Position */}
      <CashPosition />

      {/* Marketing ROI & Top Performer */}
      {quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Performance Marketing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ROI Marketing
                </div>
                <p className={cn(
                  "text-3xl font-bold",
                  cashForecastData.marketingROI >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {cashForecastData.marketingROI >= 0 ? '+' : ''}{cashForecastData.marketingROI.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Ritorno sull'investimento marketing
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Canale Top Performance
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {cashForecastData.topChannel || 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {cashForecastData.topChannelConversions > 0 
                    ? `${cashForecastData.topChannelConversions} conversioni` 
                    : 'Nessuna conversione'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ricavi Totali"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          iconClassName="bg-emerald-50"
          trend="up"
          trendValue="Anno in corso"
        />
        <StatCard
          title="Costi Totali"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          iconClassName="bg-red-50"
        />
        <StatCard
          title="Utile Netto"
          value={formatCurrency(netIncome)}
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
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={tickCurrency} />
                  <Tooltip 
                   formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Ricavi' : 'Costi']}
                   contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Ricavi" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Costi" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} />
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
                        <Cell key={`cell-${index}`} fill={tagColorMap[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm">Nessun dato sui ricavi</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {revenueByTag.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tagColorMap[entry.name] || COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                {formatCurrency(quotes.filter(q => q.status === 'won').reduce((sum, q) => sum + (q.amount || 0), 0))}
              </p>
              <p className="text-sm text-slate-500">Preventivi Vinti</p>
            </div>
          </CardContent>
        </Card>

        <FeesWidget />
      </div>

      {/* KPI Objectives Widget */}
      <KpiWidget />


    </div>
  );
}