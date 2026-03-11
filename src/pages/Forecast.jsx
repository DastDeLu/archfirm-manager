import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Plus, Pencil, TrendingUp, TrendingDown, Calendar, Euro, AlertTriangle, CheckCircle, AlertCircle, ArrowDownCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateCashForecast } from '../components/utils/cashForecast.jsx';
import { formatCurrency, tickCurrency } from '../components/lib/formatters';
import { format } from 'date-fns';
import DirectIncassoDialog from '../components/fees/DirectIncassoDialog';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function Forecast() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [incassoDialogOpen, setIncassoDialogOpen] = useState(false);
  const [incassiListOpen, setIncassiListOpen] = useState(false);
  const [editingForecast, setEditingForecast] = useState(null);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    revenue_amount: '',
    expense_amount: '',
    prestazioni: 'Progettazione',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['forecasts', selectedYear],
    queryFn: () => base44.entities.Forecast.filter({ year: selectedYear }),
  });

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments'],
    queryFn: () => base44.entities.Installment.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Forecast.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Forecast.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
      closeDialog();
    },
  });

  const openDialog = (forecast = null) => {
    if (forecast) {
      setEditingForecast(forecast);
      setFormData({
        month: forecast.month,
        year: forecast.year,
        revenue_amount: forecast.revenue_amount || '',
        expense_amount: forecast.expense_amount || '',
        prestazioni: forecast.prestazioni || 'Progettazione',
        notes: forecast.notes || ''
      });
    } else {
      setEditingForecast(null);
      setFormData({
        month: new Date().getMonth() + 1,
        year: selectedYear,
        revenue_amount: '',
        expense_amount: '',
        prestazioni: 'Progettazione',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingForecast(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      revenue_amount: parseFloat(formData.revenue_amount) || 0,
      expense_amount: parseFloat(formData.expense_amount) || 0
    };
    if (editingForecast) {
      updateMutation.mutate({ id: editingForecast.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Calculate actual vs forecast data with dynamic installments
  const chartData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthNum = idx + 1;
      const monthKey = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
      
      const forecast = forecasts.find(f => f.month === monthNum);
      
      // Actual revenue from recorded revenues
      const actualRevenue = revenues
        .filter(r => r.date?.startsWith(monthKey))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      // Expected revenue from installments due in this month
      const expectedRevenue = installments
        .filter(i => i.due_date?.startsWith(monthKey) && i.status !== 'paid' && i.status !== 'cancelled')
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      
      const actualExpense = expenses
        .filter(e => e.date?.startsWith(monthKey))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Dynamic forecast: use manual forecast OR expected from installments
      const dynamicForecastRevenue = forecast?.revenue_amount || expectedRevenue;

      return {
        month: month.substring(0, 3),
        forecastRevenue: dynamicForecastRevenue,
        forecastExpense: forecast?.expense_amount || 0,
        actualRevenue,
        actualExpense,
        expectedRevenue,
        forecast
      };
    });
  }, [forecasts, revenues, expenses, installments, selectedYear]);

  // Calculate totals
  const totals = useMemo(() => {
    return chartData.reduce((acc, item) => ({
      forecastRevenue: acc.forecastRevenue + item.forecastRevenue,
      forecastExpense: acc.forecastExpense + item.forecastExpense,
      actualRevenue: acc.actualRevenue + item.actualRevenue,
      actualExpense: acc.actualExpense + item.actualExpense,
    }), { forecastRevenue: 0, forecastExpense: 0, actualRevenue: 0, actualExpense: 0 });
  }, [chartData]);

  // Calcolo Compensi
  const compensiData = useMemo(() => {
    const yearStr = String(selectedYear);
    const ricavi = revenues
      .filter(r => r.tag === 'Compensi' && (r.date || '').startsWith(yearStr))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const costi = expenses
      .filter(e => e.tag === 'Compensi' && (e.date || '').startsWith(yearStr))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { ricavi, costi, netto: ricavi - costi };
  }, [revenues, expenses, selectedYear]);

  // Calculate cash forecast using the cashForecast utility
  const cashForecastData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Get YTD revenues and expenses
    const ytdRevenues = revenues.filter(r => r.date?.startsWith(String(currentYear)));
    const ytdExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)));
    const cfIncassiYTD = ytdRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const cfSpeseYTD = ytdExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Get pending installments as riporti
    const riporti = installments
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    
    // Previous year revenue as base
    const previousYear = currentYear - 1;
    const previousYearRevenues = revenues.filter(r => r.date?.startsWith(String(previousYear)));
    const baseAnnoPrecedente = previousYearRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Get current cash from layout query or calculate
    const cassaAttuale = 73404; // This should come from actual cash data
    
    return calculateCashForecast({
      cassaAttuale,
      riporti,
      percentualeIncasso: 0.70,
      baseAnnoPrecedente,
      growthRate: 0.35,
      speseAnnuePreviste: totals.forecastExpense,
      cfIncassiYTD,
      cfSpeseYTD,
      meseCorrente: currentMonth
    });
  }, [revenues, expenses, installments, totals.forecastExpense]);

  return (
    <div>
      <PageHeader title="Previsioni" description="Pianifica e traccia le proiezioni finanziarie">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map(year => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setIncassoDialogOpen(true)} className="gap-2">
          <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
          Inserisci Incasso
        </Button>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Previsione
        </Button>
      </PageHeader>

      {/* Cash Forecast Alerts */}
      {cashForecastData.alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {cashForecastData.alerts.map(alert => (
            <Card 
              key={alert.id}
              className={cn(
                "border-2",
                alert.level === 'critical' ? 'border-red-200 bg-red-50/50' :
                alert.level === 'attention' ? 'border-amber-200 bg-amber-50/50' :
                'border-emerald-200 bg-emerald-50/50'
              )}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    alert.level === 'critical' ? 'bg-red-100' :
                    alert.level === 'attention' ? 'bg-amber-100' :
                    'bg-emerald-100'
                  )}>
                    {alert.level === 'critical' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : alert.level === 'attention' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium mb-1",
                      alert.level === 'critical' ? 'text-red-900' :
                      alert.level === 'attention' ? 'text-amber-900' :
                      'text-emerald-900'
                    )}>
                      {alert.id.charAt(0).toUpperCase() + alert.id.slice(1)}
                    </p>
                    <p className={cn(
                      "text-xs",
                      alert.level === 'critical' ? 'text-red-700' :
                      alert.level === 'attention' ? 'text-amber-700' :
                      'text-emerald-700'
                    )}>
                      {alert.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Card Compensi */}
      <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-indigo-700 mb-3">Dettaglio Compensi – {selectedYear}</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Ricavi Compensi</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(compensiData.ricavi)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Costi Compensi</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(compensiData.costi)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Netto Compensi</p>
              <p className={cn("text-lg font-bold", compensiData.netto >= 0 ? "text-emerald-600" : "text-red-600")}>
                {compensiData.netto >= 0 ? '+' : ''}{formatCurrency(compensiData.netto)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Incassi Attesi Totali
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {formatCurrency(cashForecastData.incassiAttesiTotali)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Ricavi Effettivi
            </div>
            <p className={cn(
              "text-xl font-bold",
              totals.actualRevenue >= totals.forecastRevenue ? "text-emerald-600" : "text-amber-600"
            )}>
              {formatCurrency(totals.actualRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Costi Previsti
            </div>
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(totals.forecastExpense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Euro className="h-4 w-4 text-blue-600" />
              Cassa Fine Anno Prevista
            </div>
            <p className={cn(
              "text-xl font-bold",
              cashForecastData.cassaFineAnnoPrevista >= 65000 ? "text-emerald-600" : 
              cashForecastData.cassaFineAnnoPrevista >= 55000 ? "text-amber-600" : "text-red-600"
            )}>
              {formatCurrency(cashForecastData.cassaFineAnnoPrevista)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Previsto vs Effettivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={tickCurrency} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="forecastRevenue" name="Ricavi Previsti" fill="#10b981" opacity={0.5} />
                <Bar dataKey="actualRevenue" name="Ricavi Effettivi" fill="#10b981" />
                <Bar dataKey="forecastExpense" name="Costi Previsti" fill="#ef4444" opacity={0.5} />
                <Bar dataKey="actualExpense" name="Costi Effettivi" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Previsioni Mensili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {chartData.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => item.forecast ? openDialog(item.forecast) : openDialog()}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                  item.forecast ? "bg-slate-50 border-slate-200" : "bg-white border-dashed border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-slate-900">{MONTHS[idx]}</span>
                  {item.forecast ? (
                    <Pencil className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Plus className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                {item.forecast ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ricavi:</span>
                      <span className="text-emerald-600 font-medium">
                        {formatCurrency(item.forecastRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Costi:</span>
                      <span className="text-red-600 font-medium">
                        {formatCurrency(item.forecastExpense)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-slate-500">Netto:</span>
                      <span className={cn(
                        "font-semibold",
                        item.forecastRevenue - item.forecastExpense >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {formatCurrency(item.forecastRevenue - item.forecastExpense)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center">Clicca per aggiungere</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingForecast ? 'Modifica Previsione' : 'Aggiungi Previsione'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Mese *</Label>
                  <Select
                    value={String(formData.month)}
                    onValueChange={(v) => setFormData({ ...formData, month: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Anno *</Label>
                  <Select
                    value={String(formData.year)}
                    onValueChange={(v) => setFormData({ ...formData, year: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prestazioni">Prestazioni *</Label>
                <Select
                  value={formData.prestazioni}
                  onValueChange={(value) => setFormData({ ...formData, prestazioni: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Progettazione">Progettazione</SelectItem>
                    <SelectItem value="Direzione Lavori">Direzione Lavori</SelectItem>
                    <SelectItem value="Burocrazia">Burocrazia</SelectItem>
                    <SelectItem value="Provvigione">Provvigione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revenue_amount">Ricavi Previsti (€)</Label>
                  <Input
                    id="revenue_amount"
                    type="number"
                    value={formData.revenue_amount}
                    onChange={(e) => setFormData({ ...formData, revenue_amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_amount">Costi Previsti (€)</Label>
                  <Input
                    id="expense_amount"
                    type="number"
                    value={formData.expense_amount}
                    onChange={(e) => setFormData({ ...formData, expense_amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingForecast ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}