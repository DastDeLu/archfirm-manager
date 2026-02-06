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
import { Plus, Pencil, TrendingUp, TrendingDown, Calendar, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Forecast() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForecast, setEditingForecast] = useState(null);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    revenue_amount: '',
    expense_amount: '',
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
        notes: forecast.notes || ''
      });
    } else {
      setEditingForecast(null);
      setFormData({
        month: new Date().getMonth() + 1,
        year: selectedYear,
        revenue_amount: '',
        expense_amount: '',
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
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Previsione
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Ricavi Previsti
            </div>
            <p className="text-xl font-bold text-slate-900">
              €{totals.forecastRevenue.toLocaleString('it-IT')}
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
              €{totals.actualRevenue.toLocaleString('it-IT')}
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
              €{totals.forecastExpense.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Costi Effettivi
            </div>
            <p className={cn(
              "text-xl font-bold",
              totals.actualExpense <= totals.forecastExpense ? "text-emerald-600" : "text-red-600"
            )}>
              €{totals.actualExpense.toLocaleString('it-IT')}
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
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `€${v/1000}k`} />
                <Tooltip 
                  formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="forecastRevenue" name="Forecast Revenue" fill="#10b981" opacity={0.5} />
                <Bar dataKey="actualRevenue" name="Actual Revenue" fill="#10b981" />
                <Bar dataKey="forecastExpense" name="Forecast Expense" fill="#ef4444" opacity={0.5} />
                <Bar dataKey="actualExpense" name="Actual Expense" fill="#ef4444" />
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
                        €{item.forecastRevenue.toLocaleString('it-IT')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Costi:</span>
                      <span className="text-red-600 font-medium">
                        €{item.forecastExpense.toLocaleString('it-IT')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-slate-500">Netto:</span>
                      <span className={cn(
                        "font-semibold",
                        item.forecastRevenue - item.forecastExpense >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        €{(item.forecastRevenue - item.forecastExpense).toLocaleString('it-IT')}
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
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingForecast ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}