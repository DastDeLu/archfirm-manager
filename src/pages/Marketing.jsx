import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import { Plus, Pencil, Megaphone, Target, Euro, TrendingUp, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Marketing() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
    budget: '',
    spent: '',
    conversions: '',
    channel: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['marketing', selectedYear],
    queryFn: () => base44.entities.MarketingBudget.filter({ year: selectedYear }),
  });

  // Leggi budget annuale da UserPreferences
  const { data: userPrefs } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      try {
        const prefs = await base44.entities.UserPreferences.list();
        return prefs[0];
      } catch {
        return null;
      }
    },
  });

  const annualMarketingBudget = userPrefs?.annual_marketing_budget || 0;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketingBudget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketingBudget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing'] });
      closeDialog();
    },
  });

  const openDialog = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        month: budget.month,
        year: budget.year,
        budget: budget.budget || '',
        spent: budget.spent || '',
        conversions: budget.conversions || '',
        channel: budget.channel || '',
        notes: budget.notes || ''
      });
    } else {
      setEditingBudget(null);
      setFormData({
        month: new Date().getMonth() + 1,
        year: selectedYear,
        budget: '',
        spent: '',
        conversions: '',
        channel: '',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBudget(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      budget: parseFloat(formData.budget) || 0,
      spent: parseFloat(formData.spent) || 0,
      conversions: parseInt(formData.conversions) || 0
    };
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthNum = idx + 1;
      const budget = budgets.find(b => b.month === monthNum);
      return {
        month: month.substring(0, 3),
        budget: budget?.budget || 0,
        spent: budget?.spent || 0,
        conversions: budget?.conversions || 0,
        data: budget
      };
    });
  }, [budgets]);

  // Totals
  const totals = useMemo(() => {
    const monthlyTotals = budgets.reduce((acc, b) => ({
      budget: acc.budget + (b.budget || 0),
      spent: acc.spent + (b.spent || 0),
      conversions: acc.conversions + (b.conversions || 0),
    }), { budget: 0, spent: 0, conversions: 0 });
    
    // Include annual budget in total budget
    return {
      ...monthlyTotals,
      budget: monthlyTotals.budget + annualMarketingBudget
    };
  }, [budgets, annualMarketingBudget]);

  // Statistiche conversioni per canale social
  const socialConversionStats = useMemo(() => {
    const conversionsByChannel = budgets.reduce((acc, item) => {
      const channel = item.channel || 'Non specificato';
      if (!acc[channel]) {
        acc[channel] = { conversions: 0, spent: 0 };
      }
      acc[channel].conversions += item.conversions || 0;
      acc[channel].spent += item.spent || 0;
      return acc;
    }, {});

    const totalConversions = Object.values(conversionsByChannel).reduce(
      (sum, ch) => sum + ch.conversions,
      0
    );

    const channelStats = Object.entries(conversionsByChannel).map(([channel, data]) => ({
      channel,
      conversions: data.conversions,
      spent: data.spent,
      percentage: totalConversions > 0 ? (data.conversions / totalConversions) * 100 : 0,
      costPerConversion: data.conversions > 0 ? data.spent / data.conversions : 0
    }));

    channelStats.sort((a, b) => b.conversions - a.conversions);
    const topPerformer = channelStats.length > 0 && totalConversions > 0 ? channelStats[0].channel : null;

    return { channelStats, totalConversions, topPerformer };
  }, [budgets]);

  const costPerConversion = totals.conversions > 0 
    ? (totals.spent / totals.conversions).toFixed(2)
    : 0;

  const budgetUtilization = totals.budget > 0 
    ? ((totals.spent / totals.budget) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <PageHeader title="Marketing" description="Traccia budget, spesa e conversioni marketing">
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
          Aggiungi Voce
        </Button>
      </PageHeader>

      {/* Annual Budget Card */}
      {annualMarketingBudget > 0 && (
        <Card className="mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-blue-700 mb-1">
                  <Megaphone className="h-4 w-4" />
                  Budget Annuale Marketing
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {annualMarketingBudget.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 mb-1">Utilizzato</p>
                <p className="text-lg font-semibold text-blue-900">
                  {totals.spent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </p>
                <Progress 
                  value={annualMarketingBudget > 0 ? (totals.spent / annualMarketingBudget) * 100 : 0} 
                  className="h-1.5 mt-2 w-32" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              Budget Totale
            </div>
            <p className="text-2xl font-bold text-slate-900">
              €{totals.budget.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Euro className="h-4 w-4 text-amber-600" />
              Spesa Totale
            </div>
            <p className={cn(
              "text-2xl font-bold",
              totals.spent > totals.budget ? "text-red-600" : "text-amber-600"
            )}>
              €{totals.spent.toLocaleString('it-IT')}
            </p>
            <Progress 
              value={parseFloat(budgetUtilization)} 
              className="h-1.5 mt-2" 
            />
            <p className="text-xs text-slate-500 mt-1">{budgetUtilization}% utilizzato</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Users className="h-4 w-4 text-emerald-600" />
              Conversioni Totali
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {totals.conversions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Costo per Conversione
            </div>
            <p className="text-2xl font-bold text-purple-600">
              €{costPerConversion}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance per Canale Social */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Performance per Canale Social
          </CardTitle>
        </CardHeader>
        <CardContent>
          {socialConversionStats.totalConversions === 0 ? (
            <p className="text-center text-slate-500 py-8">Nessuna conversione registrata</p>
          ) : (
            <div className="space-y-4">
              {socialConversionStats.channelStats.map((stat) => (
                <div key={stat.channel} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{stat.channel}</span>
                      {stat.channel === socialConversionStats.topPerformer && (
                        <Badge className="bg-amber-100 text-amber-700 gap-1">
                          <Trophy className="h-3 w-3" />
                          Top Performer
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-slate-600">
                      {stat.conversions} conversioni ({stat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={stat.percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Speso: €{stat.spent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    <span>Costo/Conv: €{stat.costPerConversion.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Budget vs Spesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                  <Bar dataKey="budget" name="Budget" fill="#3b82f6" opacity={0.5} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Andamento Conversioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversions" 
                    name="Conversions"
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Dettaglio Mensile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {chartData.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.data ? openDialog(item.data) : openDialog()}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                  item.data ? "bg-slate-50 border-slate-200" : "bg-white border-dashed border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-slate-900">{MONTHS[idx]}</span>
                  {item.data ? (
                    <Pencil className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Plus className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                {item.data ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Budget:</span>
                      <span className="font-medium text-blue-600">€{item.budget.toLocaleString('it-IT')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Spent:</span>
                      <span className={cn(
                        "font-medium",
                        item.spent > item.budget ? "text-red-600" : "text-amber-600"
                      )}>
                        €{item.spent.toLocaleString('it-IT')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-slate-500">Conversioni:</span>
                      <span className="font-semibold text-emerald-600">{item.conversions}</span>
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
              {editingBudget ? 'Modifica Voce Marketing' : 'Aggiungi Voce Marketing'}
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
                  <Label htmlFor="budget">Budget (€) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spent">Speso (€)</Label>
                  <Input
                    id="spent"
                    type="number"
                    value={formData.spent}
                    onChange={(e) => setFormData({ ...formData, spent: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="conversions">Conversioni</Label>
                  <Input
                    id="conversions"
                    type="number"
                    value={formData.conversions}
                    onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">Canale</Label>
                  <Input
                    id="channel"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    placeholder="es. Google Ads"
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
                {editingBudget ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}