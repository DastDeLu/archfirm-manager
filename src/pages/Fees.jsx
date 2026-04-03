import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, ChevronDown, Receipt, Pencil, Trash2, CheckCircle, Clock, Banknote, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../components/lib/formatters';
import { cn } from '@/lib/utils';
import QuickAddClient from '../components/forms/QuickAddClient';
import QuickAddProject from '../components/forms/QuickAddProject';
import SearchableSelect from '../components/ui/searchable-select';
import DirectIncassoDialog from '../components/fees/DirectIncassoDialog';
import FeeRevenueDropdown from '../components/fees/FeeRevenueDropdown';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { withOwner } from '../lib/withOwner';
import { useSearchParams } from 'react-router-dom';

const categoryColors = {
  'Progettazione': 'bg-blue-100 text-blue-700',
  'Direzione Lavori': 'bg-purple-100 text-purple-700',
  'Pratiche Burocratiche': 'bg-amber-100 text-amber-700',
  'Provvigioni': 'bg-emerald-100 text-emerald-700',
};

export default function Fees() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddClientOpen, setQuickAddClientOpen] = useState(false);
  const [quickAddProjectOpen, setQuickAddProjectOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [expandedClient, setExpandedClient] = useState(null);
  const [incassoDialogOpen, setIncassoDialogOpen] = useState(false);
  const [selectedFeeForIncasso, setSelectedFeeForIncasso] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    project_id: '',
    project_name: '',
    amount: '',
    category: 'Progettazione',
    payment_status: 'Da incassare',
    payment_method: 'Banca',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const queryClient = useQueryClient();
  const uid = useCurrentUserId();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees', uid],
    queryFn: () => base44.entities.Fee.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', uid],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', uid],
    queryFn: () => base44.entities.Project.list(),
  });

  const createFeeMutation = useMutation({
    mutationFn: (data) => base44.entities.Fee.create(withOwner(data, uid)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      closeDialog();
    },
  });

  const updateFeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      closeDialog();
    },
  });

  const deleteFeeMutation = useMutation({
    mutationFn: (id) => base44.entities.Fee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
    },
  });

  const openDialog = (fee = null) => {
    if (fee) {
      setEditingFee(fee);
      setFormData({
        client_id: fee.client_id || '',
        client_name: fee.client_name || '',
        project_id: fee.project_id || '',
        project_name: fee.project_name || '',
        amount: fee.amount || '',
        category: fee.category || 'Progettazione',
        payment_status: fee.payment_status || 'Da incassare',
        payment_method: fee.payment_method || 'Banca',
        date: fee.date || new Date().toISOString().split('T')[0],
        notes: fee.notes || ''
      });
    } else {
      setEditingFee(null);
      setFormData({
        client_id: '',
        client_name: '',
        project_id: '',
        project_name: '',
        amount: '',
        category: 'Progettazione',
        payment_status: 'Da incassare',
        payment_method: 'Banca',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  React.useEffect(() => {
    const feeId = searchParams.get('feeId');
    if (!feeId || fees.length === 0) return;

    const targetFee = fees.find((fee) => fee.id === feeId);
    if (!targetFee) return;

    setExpandedClient(targetFee.client_id || 'unknown');
    openDialog(targetFee);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('feeId');
    nextParams.delete('installmentId');
    setSearchParams(nextParams, { replace: true });
  }, [fees, searchParams, setSearchParams, openDialog]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingFee(null);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      client_name: client?.name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount),
      project_id: formData.project_id === 'none' ? '' : formData.project_id,
      project_name: formData.project_id === 'none' ? '' : formData.project_name,
    };
    if (editingFee) {
      updateFeeMutation.mutate({ id: editingFee.id, data });
    } else {
      createFeeMutation.mutate(data);
    }
  };

  const togglePaymentStatus = (fee) => {
    const newStatus = fee.payment_status === 'Da incassare' ? 'Incassati' : 'Da incassare';
    updateFeeMutation.mutate({
      id: fee.id,
      data: { payment_status: newStatus }
    });
  };

  // Summary stats (rispetta i filtri attivi)
  const stats = useMemo(() => {
    const byCategory = {};
    const byStatus = { 'Da incassare': 0, 'Incassati': 0 };
    const byMethod = { 'Banca': 0, 'Contanti': 0 };

    const filteredForStats = fees.filter(fee => {
      const catMatch = categoryFilter === 'all' || fee.category === categoryFilter;
      const monthMatch = monthFilter === 'all' || (fee.date && fee.date.slice(5, 7) === monthFilter);
      return catMatch && monthMatch;
    });

    filteredForStats.forEach(fee => {
      // By category
      const cat = fee.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = { total: 0, toCollect: 0, collected: 0 };
      }
      byCategory[cat].total += fee.amount || 0;
      
      if (fee.payment_status === 'Da incassare') {
        byCategory[cat].toCollect += fee.amount || 0;
      } else if (fee.payment_status === 'Incassati') {
        byCategory[cat].collected += fee.amount || 0;
      }

      // By status
      byStatus[fee.payment_status] += fee.amount || 0;

      // By payment method
      byMethod[fee.payment_method] += fee.amount || 0;
    });

    return { byCategory, byStatus, byMethod };
  }, [fees, categoryFilter, monthFilter]);

  // Group fees by client
  const feesByClient = useMemo(() => {
    const grouped = {};
    fees.forEach(fee => {
      const clientId = fee.client_id || 'unknown';
      if (!grouped[clientId]) {
        grouped[clientId] = {
          client_id: clientId,
          client_name: fee.client_name || 'Cliente Sconosciuto',
          fees: []
        };
      }
      grouped[clientId].fees.push(fee);
    });
    return Object.values(grouped);
  }, [fees]);

  return (
    <div>
      <PageHeader title="Previsionale Incassi" description="Gestisci compensi clienti e traccia incassi">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Compenso
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 mb-1">Da Incassare</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(stats.byStatus['Da incassare'])}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 mb-1">Incassati</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats.byStatus['Incassati'])}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Banknote className="h-4 w-4" />
              <span>Banca da incassare</span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(stats.byMethod['Banca'])}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <PiggyBank className="h-4 w-4" />
              <span>Liquidi da incassare</span>
            </div>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(stats.byMethod['Contanti'])}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 mb-1">Totale</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.byStatus['Da incassare'] + stats.byStatus['Incassati'])}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Compensi per Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.byCategory).map(([category, data]) => (
              <div key={category} className="p-4 bg-slate-50 rounded-lg">
                <Badge className={categoryColors[category] || 'bg-slate-100 text-slate-700'}>
                  {category}
                </Badge>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  {formatCurrency(data.total)}
                </p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-600">Da incassare:</span>
                    <span className="font-semibold text-amber-700">{formatCurrency(data.toCollect)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Incassati:</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(data.collected)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i Mesi</SelectItem>
            <SelectItem value="01">Gennaio</SelectItem>
            <SelectItem value="02">Febbraio</SelectItem>
            <SelectItem value="03">Marzo</SelectItem>
            <SelectItem value="04">Aprile</SelectItem>
            <SelectItem value="05">Maggio</SelectItem>
            <SelectItem value="06">Giugno</SelectItem>
            <SelectItem value="07">Luglio</SelectItem>
            <SelectItem value="08">Agosto</SelectItem>
            <SelectItem value="09">Settembre</SelectItem>
            <SelectItem value="10">Ottobre</SelectItem>
            <SelectItem value="11">Novembre</SelectItem>
            <SelectItem value="12">Dicembre</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Categorie</SelectItem>
            <SelectItem value="Progettazione">Progettazione</SelectItem>
            <SelectItem value="Direzione Lavori">Direzione Lavori</SelectItem>
            <SelectItem value="Pratiche Burocratiche">Pratiche Burocratiche</SelectItem>
            <SelectItem value="Provvigioni">Provvigioni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Caricamento...</div>
      ) : feesByClient.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nessun compenso trovato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feesByClient.map(clientGroup => {
            const filteredFees = clientGroup.fees.filter(f => {
              const catMatch = categoryFilter === 'all' || f.category === categoryFilter;
              const monthMatch = monthFilter === 'all' || (f.date && f.date.slice(5, 7) === monthFilter);
              return catMatch && monthMatch;
            });
            
            if (filteredFees.length === 0) return null;

            const clientTotal = filteredFees.reduce((sum, f) => sum + (f.amount || 0), 0);
            const clientCollected = filteredFees
              .filter(f => f.payment_status === 'Incassati')
              .reduce((sum, f) => sum + (f.amount || 0), 0);

            return (
              <Collapsible
                key={clientGroup.client_id}
                open={expandedClient === clientGroup.client_id}
                onOpenChange={() => setExpandedClient(
                  expandedClient === clientGroup.client_id ? null : clientGroup.client_id
                )}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={cn(
                            "h-5 w-5 text-slate-500 transition-transform",
                            expandedClient === clientGroup.client_id && "rotate-180"
                          )} />
                          <div>
                            <CardTitle className="text-base font-semibold">
                              {clientGroup.client_name}
                            </CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                              {filteredFees.length} compenso/i
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Totale</p>
                          <p className="text-xl font-bold text-slate-900">
                            {formatCurrency(clientTotal)}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">
                            {formatCurrency(clientCollected)} incassati
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {filteredFees.map(fee => (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className={cn(
                                "p-2 rounded-lg",
                                fee.payment_status === 'Incassati' ? "bg-emerald-100" : "bg-amber-100"
                              )}>
                                {fee.payment_status === 'Incassati' ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={categoryColors[fee.category]}>
                                    {fee.category}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {fee.payment_method}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-500">{fee.date}</p>
                                {fee.notes && (
                                  <p className="text-xs text-slate-400 mt-1">{fee.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <FeeRevenueDropdown
                                fee={fee}
                                onAddIncasso={(f) => {
                                  setSelectedFeeForIncasso(f);
                                  setIncassoDialogOpen(true);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDialog(fee)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteFeeMutation.mutate(fee.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Fee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Modifica Compenso' : 'Aggiungi Compenso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <div className="flex gap-2">
                  <SearchableSelect
                    items={clients}
                    value={formData.client_id}
                    onValueChange={handleClientChange}
                    getValue={c => c.id}
                    getLabel={c => c.name}
                    placeholder="Seleziona cliente"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuickAddClientOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Progetto</Label>
                <div className="flex gap-2">
                  <SearchableSelect
                    items={projects}
                    value={formData.project_id}
                    onValueChange={(value) => {
                      const project = projects.find(p => p.id === value);
                      setFormData({ ...formData, project_id: value || '', project_name: project?.name || '' });
                    }}
                    getValue={p => p.id}
                    getLabel={p => p.name}
                    getSearchText={p => `${p.name} ${p.client_name || ''}`}
                    placeholder="Seleziona progetto (opzionale)"
                    className="flex-1"
                    clearable
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuickAddProjectOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (€) *</Label>
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
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Progettazione">Progettazione</SelectItem>
                    <SelectItem value="Direzione Lavori">Direzione Lavori</SelectItem>
                    <SelectItem value="Pratiche Burocratiche">Pratiche Burocratiche</SelectItem>
                    <SelectItem value="Provvigioni">Provvigioni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Stato Pagamento</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Da incassare">Da incassare</SelectItem>
                      <SelectItem value="Incassati">Incassati</SelectItem>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banca">Banca</SelectItem>
                      <SelectItem value="Contanti">Contanti</SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="button" variant="outline" onClick={closeDialog}>Annulla</Button>
              <Button type="submit" disabled={createFeeMutation.isPending || updateFeeMutation.isPending}>
                {editingFee ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DirectIncassoDialog
        open={incassoDialogOpen}
        onOpenChange={setIncassoDialogOpen}
        fee={selectedFeeForIncasso}
      />

      <QuickAddClient
        open={quickAddClientOpen}
        onOpenChange={setQuickAddClientOpen}
        onClientCreated={(client) => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          setFormData({
            ...formData,
            client_id: client.id,
            client_name: client.name
          });
        }}
      />

      <QuickAddProject
        open={quickAddProjectOpen}
        onOpenChange={setQuickAddProjectOpen}
        onProjectCreated={(project) => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          setFormData(prev => ({
            ...prev,
            project_id: project.id,
            project_name: project.name
          }));
        }}
      />
    </div>
  );
}