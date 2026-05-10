import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatCurrency } from '../components/lib/formatters';
import { format } from 'date-fns';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import QuickAddProject from '../components/forms/QuickAddProject';
import SearchableSelect from '../components/ui/searchable-select';
import SuggestTextInput from '../components/ui/suggest-text-input';
import { toast } from 'sonner';
import FeeGroupRow from '../components/revenues/FeeGroupRow';
import MobileRevenueCard from '../components/revenues/MobileRevenueCard';
import MobileFeeGroupCard from '../components/revenues/MobileFeeGroupCard';
import { Skeleton } from '@/components/ui/skeleton';

import { useCustomTags, getTagStyle } from '../components/hooks/useCustomTags';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { withOwner } from '../lib/withOwner';
import {
  assertFunctionResponse,
  deleteRevenueByCloudFunction,
  getRevenueRowId,
} from '@/lib/revenueDelete';

export default function Revenues() {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const { revenueTags, tagColorMap } = useCustomTags();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = tutti i mesi
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [revenueToDelete, setRevenueToDelete] = useState(null);
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
  const [searchParams, setSearchParams] = useSearchParams();

  const getMutationErrorMessage = (error, fallbackMessage) => {
    return (
      (typeof error?.data?.error === 'string' && error.data.error) ||
      (typeof error?.data?.message === 'string' && error.data.message) ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      fallbackMessage
    );
  };

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues', uid],
    queryFn: () => base44.entities.Revenue.list('-date'),
  });

  // Carica Fee e Installment per costruire righe sintetiche UI-only
  const { data: fees = [] } = useQuery({
    queryKey: ['fees-for-revenues'],
    queryFn: () => base44.entities.Fee.list(),
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
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, 'Errore durante la creazione del ricavo'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const linkedInstallment =
        editingRevenue?.installment_id ?? editingRevenue?.installmentId;
      if (linkedInstallment) {
        await assertFunctionResponse(
          base44.functions.invoke('syncInstallmentRevenuePair', {
            origin: 'revenue',
            revenue_id: id,
            revenue_patch: data,
          }),
        );
        return { id, ...data };
      }

      return base44.entities.Revenue.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      closeDialog();
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, "Errore durante l'aggiornamento del ricavo"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (revenue) => {
      const rid = getRevenueRowId(revenue);
      console.log('[Revenues] deleteMutation fired, row:', revenue, 'resolved id:', rid);
      await deleteRevenueByCloudFunction(base44, rid);
      return rid;
    },
    onSuccess: async (rid) => {
      console.log('[Revenues] delete SUCCESS for id:', rid);
      toast.success('Ricavo eliminato');
      setRevenueToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['revenues'] });
      if (uid != null) {
        await queryClient.refetchQueries({ queryKey: ['revenues', uid] });
      }
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['revenues-by-fee'] });
    },
    onError: (error) => {
      console.error('[Revenues] delete FAILED:', error);
      setRevenueToDelete(null);
      toast.error(getMutationErrorMessage(error, "Errore durante l'eliminazione del ricavo"));
    },
  });

  const scheduleDelete = useCallback((row) => {
    console.log('[Revenues] scheduleDelete called, row:', row);
    setRevenueToDelete(row);
  }, []);

  const openDialog = useCallback((revenue = null) => {
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
  }, [revenueTags]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingRevenue(null);
  }, []);

  useEffect(() => {
    const revenueId = searchParams.get('revenueId');
    if (!revenueId || revenues.length === 0) return;

    const target = revenues.find(
      (revenue) => revenue.id === revenueId || revenue._id === revenueId,
    );
    if (!target) return;

    openDialog(target);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('revenueId');
    setSearchParams(nextParams, { replace: true });
  }, [revenues, searchParams, setSearchParams, openDialog]);



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
      const editId = editingRevenue.id ?? editingRevenue._id;
      updateMutation.mutate({ id: editId, data });
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

  // Mappa: fee_id → totale incassato da revenues reali nel periodo (anno + mese) selezionato
  const totalIncassatoByFeeId = useMemo(() => {
    const map = {};
    revenues.forEach(r => {
      if (!r.fee_id) return;
      const yearMatch = !selectedYear || r.date?.startsWith(String(selectedYear));
      const monthMatch = !selectedMonth || r.date?.substring(5, 7) === String(selectedMonth).padStart(2, '0');
      if (yearMatch && monthMatch) {
        map[r.fee_id] = (map[r.fee_id] || 0) + (r.amount || 0);
      }
    });
    return map;
  }, [revenues, selectedYear, selectedMonth]);

  // Raggruppa i revenue filtrati: per ogni fee_id un gruppo, le righe senza fee_id restano singole
  const { feeGroups, singleRows } = useMemo(() => {
    const groupsMap = new Map();
    const singles = [];
    filteredRevenues.forEach(r => {
      if (r.fee_id) {
        if (!groupsMap.has(r.fee_id)) groupsMap.set(r.fee_id, []);
        groupsMap.get(r.fee_id).push(r);
      } else {
        singles.push(r);
      }
    });

    const groups = [];
    groupsMap.forEach((groupRevenues, feeId) => {
      const fee = fees.find(f => f.id === feeId);
      const incassatoFiltrato = groupRevenues.reduce((s, r) => s + (r.amount || 0), 0);
      const incassatoTotale = totalIncassatoByFeeId[feeId] || 0;
      const residuo = (fee?.amount || 0) - incassatoTotale;
      const lastDate = groupRevenues
        .map(r => r.date)
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || '';
      groups.push({
        feeId,
        fee,
        revenues: groupRevenues,
        incassatoFiltrato,
        incassatoTotale,
        residuo: residuo > 0 ? residuo : 0,
        sortDate: lastDate,
      });
    });

    // Compensi pieni del periodo che NON hanno revenue nel filtro: aggiungi gruppi "vuoti" con residuo
    // (mantengo il comportamento precedente delle synthetic rows quando ci sono pagamenti del fee)
    return {
      feeGroups: groups.sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || '')),
      singleRows: singles,
    };
  }, [filteredRevenues, fees, totalIncassatoByFeeId]);

  return (
    <div>
      {/* Mobile header (sm:hidden) */}
      <div className="sm:hidden mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Ricavi</h1>
        <p className="text-sm text-slate-500 mt-1">Traccia tutte le entrate e i flussi di ricavo</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i mesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tutti i mesi</SelectItem>
              {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'].map((m, i) => (
                <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => openDialog()} className="w-full mt-2 gap-2 h-11 rounded-xl">
          <Plus className="h-4 w-4" />
          Aggiungi Ricavo
        </Button>
      </div>

      {/* Desktop header (hidden sm:flex) */}
      <div className="hidden sm:block">
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
      </div>

      {/* Summary Cards - scrollabili orizzontalmente su mobile */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible snap-x snap-mandatory sm:snap-none [&>*]:min-w-[70%] [&>*]:snap-start sm:[&>*]:min-w-0">
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

      {/* Filter Tabs - scrollabili su mobile */}
      <Tabs value={activeTag} onValueChange={setActiveTag} className="mb-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            {revenueTags.map(tag => (
              <TabsTrigger key={tag.id} value={tag.name}>{tag.name}</TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <Skeleton className="h-6 w-full mb-3" />
          <Skeleton className="h-6 w-full mb-3" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : (feeGroups.length === 0 && singleRows.length === 0) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">Nessun ricavo registrato. Clicca &apos;Aggiungi Ricavo&apos; per iniziare.</p>
        </div>
      ) : (
        <>
        {/* Mobile list - card stacked */}
        <div className="sm:hidden space-y-3">
          {feeGroups.map(group => (
            <MobileFeeGroupCard
              key={`m-group-${group.feeId}`}
              fee={group.fee}
              revenues={group.revenues}
              totalIncassato={group.incassatoTotale}
              residuo={group.residuo}
              tagColor={tagColorMap[group.fee?.category]}
              onEditRevenue={openDialog}
              onDeleteRevenue={scheduleDelete}
            />
          ))}
          {singleRows.map(row => (
            <MobileRevenueCard
              key={`m-${row.id}`}
              revenue={row}
              tagColor={tagColorMap[row.tag]}
              onEdit={openDialog}
              onDelete={scheduleDelete}
            />
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="font-semibold text-slate-700 text-left text-sm py-3 px-4">Data</th>
                <th className="font-semibold text-slate-700 text-left text-sm py-3 px-4">Descrizione</th>
                <th className="font-semibold text-slate-700 text-left text-sm py-3 px-4">Tag</th>
                <th className="font-semibold text-slate-700 text-right text-sm py-3 px-4">Importo</th>
                <th className="w-12 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {feeGroups.map(group => (
                <FeeGroupRow
                  key={`group-${group.feeId}`}
                  fee={group.fee}
                  revenues={group.revenues}
                  totalIncassato={group.incassatoTotale}
                  residuo={group.residuo}
                  tagColor={tagColorMap[group.fee?.category]}
                  onEditRevenue={openDialog}
                  onDeleteRevenue={scheduleDelete}
                />
              ))}
              {singleRows.map(row => {
                const color = tagColorMap[row.tag];
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                    <td className="py-3 px-4">
                      <span className="text-slate-600 text-sm">
                        {row.date ? format(new Date(row.date), 'MMM d, yyyy') : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{row.description || 'Nessuna descrizione'}</p>
                      {row.project_name && (
                        <p className="text-xs text-slate-500">{row.project_name}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full border"
                        style={color ? getTagStyle(color) : {}}
                      >
                        {row.tag || 'Altro'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-emerald-600">
                        +{formatCurrency(row.amount || 0)}
                      </span>
                    </td>
                    <td className="py-3 px-4 w-12">
                      <ContextMenuWrapper
                        onEdit={() => openDialog(row)}
                        onDelete={() => scheduleDelete(row)}
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
                            <DropdownMenuItem onClick={() => scheduleDelete(row)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ContextMenuWrapper>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

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

      <AlertDialog
        open={!!revenueToDelete}
        onOpenChange={(open) => {
          if (!open) setRevenueToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo ricavo?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;operazione non può essere annullata. Se il ricavo è collegato a compenso o rata, la
              sincronizzazione verrà aggiornata sul server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => {
                console.log('[Revenues] AlertDialog confirm clicked, revenueToDelete:', revenueToDelete);
                if (revenueToDelete) {
                  deleteMutation.mutate(revenueToDelete);
                }
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}