import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, Euro, Filter, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatCurrency } from '../components/lib/formatters';
import { format } from 'date-fns';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import QuickAddProject from '../components/forms/QuickAddProject';
import SearchableSelect from '../components/ui/searchable-select';
import SuggestTextInput from '../components/ui/suggest-text-input';

import { useCustomTags, getTagStyle } from '../components/hooks/useCustomTags';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { withOwner } from '../lib/withOwner';

export default function Revenues() {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const { revenueTags, tagColorMap } = useCustomTags();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = tutti i mesi
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [activeTag, setActiveTag] = useState('all');
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    tag: '',
    payment_method: 'bank_transfer',
    project_id: '',
    project_name: ''
  });

  const queryClient = useQueryClient();
  const uid = useCurrentUserId();

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues', uid],
    queryFn: () => base44.entities.Revenue.list('-date'),
  });



  const { data: projects = [] } = useQuery({
    queryKey: ['projects', uid],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Revenue.create(withOwner(data, uid)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedRevenue = await base44.entities.Revenue.update(id, data);

      if (editingRevenue?.installment_id) {
        await base44.entities.Installment.update(editingRevenue.installment_id, {
          amount: data.amount,
          paid_date: data.date,
          payment_method: data.payment_method === 'cash' ? 'cash' : 'bank',
          status: 'paid',
        });
      }

      return updatedRevenue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Revenue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
    },
  });

  const openDialog = (revenue = null) => {
    if (revenue) {
      setEditingRevenue(revenue);
      setFormData({
        amount: revenue.amount || '',
        date: revenue.date || format(new Date(), 'yyyy-MM-dd'),
        description: revenue.description || '',
        tag: revenue.tag || '',
        payment_method: revenue.payment_method || 'bank_transfer',
        project_id: revenue.project_id || '',
        project_name: revenue.project_name || ''
      });
    } else {
      setEditingRevenue(null);
      setFormData({
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        tag: revenueTags[0]?.name || '',
        payment_method: 'bank_transfer',
        project_id: '',
        project_name: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRevenue(null);
  };



  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setFormData({ 
      ...formData, 
      project_id: projectId,
      project_name: project?.name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount)
    };
    if (editingRevenue) {
      updateMutation.mutate({ id: editingRevenue.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filtra per tag, anno e mese selezionati
  const filteredRevenues = useMemo(() => {
    return revenues.filter(r => {
      const tagMatch = activeTag === 'all' || r.tag === activeTag;
      const yearMatch = !selectedYear || r.date?.startsWith(String(selectedYear));
      const monthMatch = !selectedMonth || r.date?.substring(5, 7) === String(selectedMonth).padStart(2, '0');
      return tagMatch && yearMatch && monthMatch;
    });
  }, [revenues, activeTag, selectedYear, selectedMonth]);

  const monthNames = ['', 'Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  const yearlyData = useMemo(() => {
    const matchMonth = (dateStr, month) => {
      if (!month) return true;
      return dateStr?.substring(5, 7) === String(month).padStart(2, '0');
    };

    const tagMatch = (r) => activeTag === 'all' || r.tag === activeTag;

    const currentYearRevenues = revenues.filter(r =>
      r.date?.startsWith(String(currentYear)) && matchMonth(r.date, selectedMonth) && tagMatch(r)
    );
    const previousYearRevenues = revenues.filter(r =>
      r.date?.startsWith(String(previousYear)) && matchMonth(r.date, selectedMonth) && tagMatch(r)
    );
    
    const currentTotal = currentYearRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const previousTotal = previousYearRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
    const delta = currentTotal - previousTotal;
    const deltaPercent = previousTotal > 0 ? ((delta / previousTotal) * 100).toFixed(1) : 0;

    const periodLabel = selectedMonth ? monthNames[selectedMonth] : 'Anno';

    return { currentTotal, previousTotal, delta, deltaPercent, periodLabel };
  }, [revenues, currentYear, previousYear, selectedMonth, activeTag]);

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

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
          {row.project_name && (
            <p className="text-xs text-slate-500">{row.project_name}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Tag',
      cell: (row) => {
        const color = tagColorMap[row.tag];
        return (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={color ? getTagStyle(color) : {}}
          >
            {row.tag || 'Altro'}
          </span>
        );
      },
    },
    {
      header: 'Importo',
      cell: (row) => (
        <span className="font-semibold text-emerald-600">
          +{formatCurrency(row.amount || 0)}
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
      <PageHeader title="Ricavi" description="Traccia tutte le entrate e i flussi di ricavo">
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
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tutti i mesi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tutti i mesi</SelectItem>
            {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'].map((m, i) => (
              <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Ricavo
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              {activeTag === 'all' ? 'Ricavi Totali' : `Ricavi ${activeTag}`}
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalAmount)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{filteredRevenues.length} voci</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {yearlyData.periodLabel} {currentYear}
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(yearlyData.currentTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{selectedMonth ? `${monthNames[selectedMonth]} ${currentYear}` : 'Anno corrente'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {yearlyData.periodLabel} {previousYear}
            </div>
            <p className="text-2xl font-bold text-slate-600">
              {formatCurrency(yearlyData.previousTotal)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{selectedMonth ? `${monthNames[selectedMonth]} ${previousYear}` : 'Anno precedente'}</p>
          </CardContent>
        </Card>
        <Card className={yearlyData.delta >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              {yearlyData.delta >= 0 ? (
                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              )}
              YoY Delta
            </div>
            <p className={`text-2xl font-bold ${yearlyData.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {yearlyData.delta >= 0 ? '+' : ''}{formatCurrency(yearlyData.delta)}
            </p>
            <p className={`text-xs mt-1 ${yearlyData.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {yearlyData.delta >= 0 ? '+' : ''}{yearlyData.deltaPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTag} onValueChange={setActiveTag} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          {revenueTags.map(tag => (
            <TabsTrigger key={tag.id} value={tag.name}>{tag.name}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredRevenues}
        loading={isLoading}
        emptyMessage="Nessun ricavo registrato. Clicca 'Aggiungi Ricavo' per iniziare."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRevenue ? 'Modifica Ricavo' : 'Aggiungi Nuovo Ricavo'}
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
                <SuggestTextInput
                  id="description"
                  value={formData.description}
                  onChange={(v) => setFormData({ ...formData, description: v })}
                  placeholder="Descrizione ricavo"
                  suggestions={[...new Set(revenues.map(r => r.description).filter(Boolean))]}
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
                      {revenueTags.length === 0
                        ? <SelectItem value={null} disabled>Configura tag in Impostazioni</SelectItem>
                        : revenueTags.map(tag => (
                          <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="bank_transfer">Banca</SelectItem>
                      <SelectItem value="cash">Contanti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Progetto</Label>
                <div className="flex gap-2">
                  <SearchableSelect
                    items={projects}
                    value={formData.project_id}
                    onValueChange={handleProjectChange}
                    getValue={p => p.id}
                    getLabel={p => p.name}
                    getSearchText={p => `${p.name} ${p.client_name || ''}`}
                    placeholder="Seleziona progetto"
                    className="flex-1"
                    clearable
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuickAddOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRevenue ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickAddProject
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onProjectCreated={(project) => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          setFormData({
            ...formData,
            project_id: project.id,
            project_name: project.name
          });
        }}
      />
    </div>
  );
}