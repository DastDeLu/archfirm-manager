import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBudget } from '../components/budget/BudgetContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingDown, Filter, ArrowUpCircle, ArrowDownCircle, BarChart3, Calendar, Receipt } from 'lucide-react';
import { formatCurrency } from '../components/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import QuickAddChapter from '../components/forms/QuickAddChapter';

import { useCustomTags, getTagStyle } from '../components/hooks/useCustomTags';

export default function Expenses() {
  const currentYear = new Date().getFullYear();
  const { categorie, vociSpesa } = useBudget();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddChapterOpen, setQuickAddChapterOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [activeTag, setActiveTag] = useState('all');
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    tag: 'Spese Fisse',
    expense_type: 'variable',
    payment_method: 'bank_transfer',
    nature: '',
    payment_frequency: 'monthly',
    chapter_id: '',
    chapter_name: '',
    id_voce_spesa: ''
  });

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date')
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['expense-chapters'],
    queryFn: () => base44.entities.Chapter.filter({ type: 'expense' })
  });

  const updateVoceSpesa = async (idVoceSpesa, delta) => {
    if (!idVoceSpesa || delta === 0) return;
    const voci = await base44.entities.VoceSpesa.filter({ id: idVoceSpesa });
    const voce = voci[0];
    if (!voce) return;
    const nuovoSpeso = Math.max(0, (voce.speso_reale || 0) + delta);
    const nuovoResiduo = voce.budget_totale - nuovoSpeso;
    await base44.entities.VoceSpesa.update(idVoceSpesa, {
      speso_reale: nuovoSpeso,
      residuo: nuovoResiduo,
      data_aggiornamento: new Date().toISOString()
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const spesa = await base44.entities.Expense.create(data);
      if (data.id_voce_spesa) {
        await updateVoceSpesa(data.id_voce_spesa, data.amount);
      }
      return spesa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      closeDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldExpense = expenses.find((e) => e.id === id);
      const spesa = await base44.entities.Expense.update(id, data);
      // Se cambia la voce collegata o l'importo, aggiorna i budget
      const oldVoce = oldExpense?.id_voce_spesa;
      const newVoce = data.id_voce_spesa;
      if (oldVoce && oldVoce !== newVoce) {
        // Storna dalla vecchia voce
        await updateVoceSpesa(oldVoce, -(oldExpense.amount || 0));
      }
      if (newVoce) {
        if (oldVoce === newVoce) {
          // Stessa voce, aggiusta la differenza
          const delta = data.amount - (oldExpense?.amount || 0);
          await updateVoceSpesa(newVoce, delta);
        } else {
          // Nuova voce, aggiungi il nuovo importo
          await updateVoceSpesa(newVoce, data.amount);
        }
      }
      return spesa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      closeDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
    }
  });

  const openDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        amount: expense.amount || '',
        date: expense.date || format(new Date(), 'yyyy-MM-dd'),
        description: expense.description || '',
        tag: expense.tag || 'Fixed',
        expense_type: expense.expense_type || 'variable',
        payment_method: expense.payment_method || 'bank_transfer',
        nature: expense.nature || '',
        payment_frequency: expense.payment_frequency || 'monthly',
        chapter_id: expense.chapter_id || '',
        chapter_name: expense.chapter_name || '',
        id_voce_spesa: expense.id_voce_spesa || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        tag: 'Costi Generali',
        expense_type: 'variable',
        payment_method: 'bank_transfer',
        nature: '',
        payment_frequency: 'monthly',
        chapter_id: '',
        chapter_name: '',
        id_voce_spesa: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
  };

  const handleChapterChange = (chapterId) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    setFormData({
      ...formData,
      chapter_id: chapterId,
      chapter_name: chapter?.name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let chapter_id = formData.chapter_id;
    let chapter_name = formData.chapter_name;

    // Se c'è una voce di spesa collegata, ricava il capitolo dalla categoria
    if (formData.id_voce_spesa) {
      const voce = vociSpesa.find((v) => v.id === formData.id_voce_spesa);
      const cat = categorie.find((c) => c.id === voce?.id_categoria);
      if (cat) {
        chapter_id = cat.id;
        chapter_name = cat.nome;
      }
    }

    const data = {
      ...formData,
      amount: parseFloat(formData.amount),
      chapter_id,
      chapter_name,
    };
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const previousYear = currentYear - 1;

  const filteredExpenses = activeTag === 'all' ?
  expenses :
  expenses.filter((e) => e.tag === activeTag);

  const yearlyData = useMemo(() => {
    const currentYearExpenses = expenses.filter((e) => e.date?.startsWith(String(currentYear)));
    const previousYearExpenses = expenses.filter((e) => e.date?.startsWith(String(previousYear)));

    const currentTotal = currentYearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const previousTotal = previousYearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const delta = currentTotal - previousTotal;
    const deltaPercent = previousTotal > 0 ? (delta / previousTotal * 100).toFixed(1) : 0;

    return { currentTotal, previousTotal, delta, deltaPercent };
  }, [expenses, currentYear, previousYear]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Summary stats by category - all expenses
  const summaryByTag = useMemo(() => {
    const summary = {};
    expenses.forEach((exp) => {
      const tag = exp.tag || 'Other';
      if (!summary[tag]) {
        summary[tag] = { total: 0, count: 0 };
      }
      summary[tag].total += exp.amount || 0;
      summary[tag].count += 1;
    });
    return summary;
  }, [expenses]);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const variableExpenses = expenses.filter((e) => e.expense_type === 'variable').reduce((sum, e) => sum + (e.amount || 0), 0);
  const fixedExpenses = expenses.filter((e) => e.expense_type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);

  const columns = [
  {
    header: 'Data',
    cell: (row) =>
    <span className="text-slate-600">
          {row.date ? format(new Date(row.date), 'MMM d, yyyy') : '-'}
        </span>

  },
  {
    header: 'Descrizione',
    cell: (row) =>
    <div>
          <p className="font-medium text-slate-900">{row.description || row.nature || 'Nessuna descrizione'}</p>
          {row.expense_type === 'fixed' && row.payment_frequency &&
      <Badge variant="outline" className="text-xs mt-1">
              {row.payment_frequency}
            </Badge>
      }
        </div>

  },
  {
    header: 'Tag',
    cell: (row) =>
    <Badge className={tagColors[row.tag || 'Other']}>
          {row.tag || 'Other'}
        </Badge>

  },
  {
    header: 'Capitolo',
    cell: (row) =>
    <span className="text-slate-600">{row.chapter_name || '-'}</span>

  },
  {
    header: 'Importo',
    cell: (row) =>
    <span className="font-semibold text-red-600">
          -{formatCurrency(row.amount || 0)}
        </span>

  },
  {
    header: '',
    headerClassName: 'w-12',
    cell: (row) =>
    <ContextMenuWrapper
      onEdit={() => openDialog(row)}
      onDelete={() => deleteMutation.mutate(row.id)}>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDialog(row)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem
            onClick={() => deleteMutation.mutate(row.id)}
            className="text-red-600">

                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ContextMenuWrapper>

  }];


  return (
    <div>
      <PageHeader title="Spese" description="Traccia tutte le spese aziendali">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((year) =>
            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Spesa
        </Button>
      </PageHeader>

      {/* Summary Cards by Type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Totale Costi</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Costi Variabili</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(variableExpenses)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Costi Fissi</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(fixedExpenses)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Numero Spese</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {filteredExpenses.length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Filter className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-base font-semibold">Totali per Categoria</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(summaryByTag).map(([tag, data]) =>
            <div key={tag} className="p-4 bg-slate-50 rounded-lg">
                <Badge className={tagColors[tag] || 'bg-slate-100 text-slate-700'}>
                  {tag}
                </Badge>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  {formatCurrency(data.total)}
                </p>
                <p className="text-xs text-slate-500 mt-1">{data.count} spese</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtered Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              {activeTag === 'all' ? 'Spese Totali' : `Spese ${activeTag}`}
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{filteredExpenses.length} voci</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {currentYear}
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(yearlyData.currentTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Anno corrente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {previousYear}
            </div>
            <p className="text-2xl font-bold text-slate-600">
              {formatCurrency(yearlyData.previousTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Anno precedente</p>
          </CardContent>
        </Card>
        <Card className={yearlyData.delta <= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {yearlyData.delta <= 0 ?
              <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> :

              <ArrowUpCircle className="h-4 w-4 text-red-600" />
              }
              YoY Delta
            </div>
            <p className={`text-2xl font-bold ${yearlyData.delta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {yearlyData.delta >= 0 ? '+' : ''}{formatCurrency(yearlyData.delta)}
            </p>
            <p className={`text-xs mt-1 ${yearlyData.delta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {yearlyData.delta >= 0 ? '+' : ''}{yearlyData.deltaPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTag} onValueChange={setActiveTag} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          {TAGS.map((tag) =>
          <TabsTrigger key={tag} value={tag}>{tag}</TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredExpenses}
        loading={isLoading}
        emptyMessage="Nessuna spesa registrata. Clicca 'Aggiungi Spesa' per iniziare." />


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Modifica Spesa' : 'Aggiungi Nuova Spesa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (EUR) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    required />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required />

                </div>
              </div>
              








              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione della spesa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">Tag *</Label>
                  <Select
                    value={formData.tag}
                    onValueChange={(value) => setFormData({ ...formData, tag: value })}>

                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map((tag) =>
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_type">Tipo *</Label>
                  <Select
                    value={formData.expense_type}
                    onValueChange={(value) => setFormData({ ...formData, expense_type: value })}>

                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="variable">Variabile</SelectItem>
                      <SelectItem value="fixed">Fisso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Metodo Pagamento *</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>

                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Contanti</SelectItem>
                    <SelectItem value="bank_transfer">Bonifico</SelectItem>
                    <SelectItem value="card">Carta</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.expense_type === 'fixed' &&
              <>





                  <div className="space-y-2">
                    <Label htmlFor="payment_frequency">Frequenza Pagamento *</Label>
                    <Select
                    value={formData.payment_frequency}
                    onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}>

                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="bimonthly">Bimestrale</SelectItem>
                        <SelectItem value="quarterly">Trimestrale</SelectItem>
                        <SelectItem value="semiannual">Semestrale</SelectItem>
                        <SelectItem value="annual">Annuale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              }

              {vociSpesa.length > 0 &&
              <div className="space-y-2">
                  <Label>Voce di Spesa (opzionale)</Label>
                  <Select
                  value={formData.id_voce_spesa}
                  onValueChange={(val) => {
                    if (val === '__none__') {
                      setFormData((prev) => ({ ...prev, id_voce_spesa: '', chapter_id: '', chapter_name: '' }));
                    } else {
                      const voce = vociSpesa.find((v) => v.id === val);
                      const cat = categorie.find((c) => c.id === voce?.id_categoria);
                      setFormData((prev) => ({
                        ...prev,
                        id_voce_spesa: val,
                        chapter_id: cat?.id || '',
                        chapter_name: cat?.nome || ''
                      }));
                    }
                  }}>

                    <SelectTrigger>
                      <SelectValue placeholder="Collega a voce di spesa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessuna</SelectItem>
                      {categorie.map((cat) => {
                      const voci = vociSpesa.filter((v) => v.id_categoria === cat.id);
                      if (!voci.length) return null;
                      return voci.map((voce) =>
                      <SelectItem key={voce.id} value={voce.id}>
                            {cat.nome} › {voce.nome}
                          </SelectItem>
                      );
                    })}
                    </SelectContent>
                  </Select>
                  {formData.chapter_name && (
                    <p className="text-xs text-slate-500">Capitolo: <span className="font-medium">{formData.chapter_name}</span></p>
                  )}
                </div>
              }
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingExpense ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <QuickAddChapter
        open={quickAddChapterOpen}
        onOpenChange={setQuickAddChapterOpen}
        onChapterCreated={(chapter) => {
          queryClient.setQueryData(['expense-chapters'], (old) => [...(old || []), chapter]);
          setFormData((prev) => ({ ...prev, chapter_id: chapter.id, chapter_name: chapter.name }));
        }} />

    </div>);

}