import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingDown, Filter, ArrowUpCircle, ArrowDownCircle, BarChart3, Calendar, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import QuickAddChapter from '../components/forms/QuickAddChapter';

const TAGS = [
  'Acquisti materie prime',
  'Costi Produttivi',
  'Costi del Personale',
  'Costi Generali',
  'Costi Amministrativi',
  'Mutui e Prestiti',
  'Oneri Tributari'
];

const tagColors = {
  'Acquisti materie prime': 'bg-amber-100 text-amber-700',
  'Costi Produttivi': 'bg-orange-100 text-orange-700',
  'Costi del Personale': 'bg-emerald-100 text-emerald-700',
  'Costi Generali': 'bg-blue-100 text-blue-700',
  'Costi Amministrativi': 'bg-purple-100 text-purple-700',
  'Mutui e Prestiti': 'bg-red-100 text-red-700',
  'Oneri Tributari': 'bg-rose-100 text-rose-700',
};

export default function Expenses() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
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
    chapter_name: ''
  });

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['expense-chapters'],
    queryFn: () => base44.entities.Chapter.filter({ type: 'expense' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
    },
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
        chapter_name: expense.chapter_name || ''
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
        chapter_name: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
  };

  const handleChapterChange = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    setFormData({ 
      ...formData, 
      chapter_id: chapterId,
      chapter_name: chapter?.name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.chapter_id) {
      return;
    }
    const data = {
      ...formData,
      amount: parseFloat(formData.amount)
    };
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const previousYear = currentYear - 1;
  
  const filteredExpenses = activeTag === 'all' 
    ? expenses 
    : expenses.filter(e => e.tag === activeTag);

  const yearlyData = useMemo(() => {
    const currentYearExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)));
    const previousYearExpenses = expenses.filter(e => e.date?.startsWith(String(previousYear)));
    
    const currentTotal = currentYearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const previousTotal = previousYearExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const delta = currentTotal - previousTotal;
    const deltaPercent = previousTotal > 0 ? ((delta / previousTotal) * 100).toFixed(1) : 0;

    return { currentTotal, previousTotal, delta, deltaPercent };
  }, [expenses, currentYear, previousYear]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Summary stats by category - all expenses
  const summaryByTag = useMemo(() => {
    const summary = {};
    expenses.forEach(exp => {
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
  const variableExpenses = expenses.filter(e => e.expense_type === 'variable').reduce((sum, e) => sum + (e.amount || 0), 0);
  const fixedExpenses = expenses.filter(e => e.expense_type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);

  const columns = [
    {
      header: 'Data',
      cell: (row) => (
        <span className="text-slate-600">
          {row.date ? format(new Date(row.date), 'MMM d, yyyy') : '-'}
        </span>
      ),
    },
    {
      header: 'Descrizione',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.description || 'Nessuna descrizione'}</p>
          {row.expense_type === 'fixed' && row.nature && (
            <p className="text-xs text-slate-500">{row.nature}</p>
          )}
          {row.expense_type === 'fixed' && row.payment_frequency && (
            <Badge variant="outline" className="text-xs mt-1">
              {row.payment_frequency}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Tag',
      cell: (row) => (
        <Badge className={tagColors[row.tag || 'Other']}>
          {row.tag || 'Other'}
        </Badge>
      ),
    },
    {
      header: 'Capitolo',
      cell: (row) => (
        <span className="text-slate-600">{row.chapter_name || '-'}</span>
      ),
    },
    {
      header: 'Importo',
      cell: (row) => (
        <span className="font-semibold text-red-600">
          -€{(row.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: '',
      headerClassName: 'w-12',
      cell: (row) => (
        <ContextMenuWrapper
          onEdit={() => openDialog(row)}
          onDelete={() => deleteMutation.mutate(row.id)}
        >
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
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ContextMenuWrapper>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Spese" description="Traccia tutte le spese aziendali">
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
                  €{totalExpenses.toLocaleString('it-IT')}
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
                  €{variableExpenses.toLocaleString('it-IT')}
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
                  €{fixedExpenses.toLocaleString('it-IT')}
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
            {Object.entries(summaryByTag).map(([tag, data]) => (
              <div key={tag} className="p-4 bg-slate-50 rounded-lg">
                <Badge className={tagColors[tag] || 'bg-slate-100 text-slate-700'}>
                  {tag}
                </Badge>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  €{data.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 mt-1">{data.count} spese</p>
              </div>
            ))}
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
              €{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
              €{yearlyData.currentTotal.toLocaleString('it-IT')}
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
              €{yearlyData.previousTotal.toLocaleString('it-IT')}
            </p>
            <p className="text-xs text-slate-500 mt-1">Anno precedente</p>
          </CardContent>
        </Card>
        <Card className={yearlyData.delta <= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {yearlyData.delta <= 0 ? (
                <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
              )}
              YoY Delta
            </div>
            <p className={`text-2xl font-bold ${yearlyData.delta <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {yearlyData.delta >= 0 ? '+' : ''}€{yearlyData.delta.toLocaleString('it-IT')}
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
          {TAGS.map(tag => (
            <TabsTrigger key={tag} value={tag}>{tag}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredExpenses}
        loading={isLoading}
        emptyMessage="Nessuna spesa registrata. Clicca 'Aggiungi Spesa' per iniziare."
      />

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
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione spesa"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">Tag *</Label>
                  <Select
                    value={formData.tag}
                    onValueChange={(value) => setFormData({ ...formData, tag: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_type">Tipo *</Label>
                  <Select
                    value={formData.expense_type}
                    onValueChange={(value) => setFormData({ ...formData, expense_type: value })}
                  >
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
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
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
              {formData.expense_type === 'fixed' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nature">Natura/Descrizione *</Label>
                    <Input
                      id="nature"
                      value={formData.nature}
                      onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
                      placeholder="Natura della spesa fissa"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_frequency">Frequenza Pagamento *</Label>
                    <Select
                      value={formData.payment_frequency}
                      onValueChange={(value) => setFormData({ ...formData, payment_frequency: value })}
                    >
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
              )}
              <div className="space-y-2">
                <Label htmlFor="chapter">Capitolo *</Label>
                <Select
                  value={formData.chapter_id}
                  onValueChange={handleChapterChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona capitolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map(chapter => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
    </div>
  );
}