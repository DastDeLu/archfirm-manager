import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, MoreHorizontal, Pencil, Trash2, Receipt, AlertCircle, 
  Euro, Calendar, CheckCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import QuickAddProject from '../components/forms/QuickAddProject';
import QuickAddClient from '../components/forms/QuickAddClient';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  agreed: 'bg-blue-100 text-blue-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const installmentStatusColors = {
  pending: 'bg-slate-100 text-slate-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function FeeCard({ fee, installments, onEdit, onDelete, onManageInstallments }) {
  const [expanded, setExpanded] = useState(false);
  const feeInstallments = installments.filter(i => i.fee_id === fee.id);
  const paidAmount = feeInstallments
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const progress = fee.total_amount > 0 ? (paidAmount / fee.total_amount) * 100 : 0;

  const today = new Date();
  const overdueInstallments = feeInstallments.filter(i => 
    i.status !== 'paid' && i.due_date && isAfter(today, parseISO(i.due_date))
  );

  return (
    <ContextMenuWrapper
      onEdit={() => onEdit(fee)}
      onDelete={() => onDelete(fee.id)}
    >
      <Card className={cn(
        "transition-all cursor-pointer",
        overdueInstallments.length > 0 && "border-red-200 bg-red-50/30"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl",
                overdueInstallments.length > 0 ? "bg-red-100" : "bg-amber-50"
              )}>
                <Receipt className={cn(
                  "h-5 w-5",
                  overdueInstallments.length > 0 ? "text-red-600" : "text-amber-600"
                )} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{fee.project_name || 'Senza titolo'}</CardTitle>
                <p className="text-sm text-slate-500">{fee.client_name || 'Nessun cliente'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[fee.status || 'draft']}>
                {fee.status || 'draft'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(fee)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifica
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onManageInstallments(fee)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Gestisci Rate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(fee.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Importo Totale</p>
            <p className="text-2xl font-bold text-slate-900">
              €{(fee.total_amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Pagato</p>
            <p className="text-lg font-semibold text-emerald-600">
              €{paidAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Progresso</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {overdueInstallments.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-red-100 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 font-medium">
              {overdueInstallments.length} rata{overdueInstallments.length > 1 ? 'e' : ''} scaduta{overdueInstallments.length > 1 ? 'e' : ''}
            </span>
          </div>
        )}

        {feeInstallments.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between"
            >
              <span>{feeInstallments.length} Rata{feeInstallments.length > 1 ? 'e' : ''}</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {expanded && (
              <div className="space-y-2 pt-2 border-t">
                {feeInstallments.map((inst, idx) => {
                  const isOverdue = inst.status !== 'paid' && inst.due_date && isAfter(today, parseISO(inst.due_date));
                  return (
                    <div 
                      key={inst.id} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        isOverdue ? "bg-red-50" : "bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          inst.status === 'paid' ? "bg-emerald-100 text-emerald-700" : 
                          isOverdue ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"
                        )}>
                          {inst.status === 'paid' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            inst.installment_number || idx + 1
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            €{(inst.amount || 0).toLocaleString('it-IT')}
                          </p>
                          <p className="text-xs text-slate-500">
                            Scadenza: {inst.due_date ? format(parseISO(inst.due_date), 'd MMM yyyy') : 'Da definire'}
                          </p>
                        </div>
                      </div>
                      <Badge className={installmentStatusColors[isOverdue && inst.status !== 'paid' ? 'overdue' : inst.status]}>
                        {isOverdue && inst.status !== 'paid' ? 'overdue' : inst.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {fee.agreed_date && (
          <div className="flex items-center gap-2 text-sm text-slate-500 pt-2 border-t">
            <Calendar className="h-4 w-4" />
            Accordato: {format(parseISO(fee.agreed_date), 'd MMM yyyy')}
          </div>
        )}
      </CardContent>
      </Card>
    </ContextMenuWrapper>
  );
}

export default function Fees() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddClientOpen, setQuickAddClientOpen] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [formData, setFormData] = useState({
    project_id: '',
    project_name: '',
    client_name: '',
    total_amount: '',
    agreed_date: '',
    status: 'draft',
    notes: ''
  });
  const [installmentForm, setInstallmentForm] = useState({
    amount: '',
    due_date: '',
    status: 'pending',
    payment_method: 'bank',
    installment_number: 1
  });

  const queryClient = useQueryClient();

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: () => base44.entities.Fee.list('-created_date'),
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments'],
    queryFn: () => base44.entities.Installment.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createFeeMutation = useMutation({
    mutationFn: (data) => base44.entities.Fee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      closeDialog();
    },
  });

  const updateFeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      closeDialog();
    },
  });

  const deleteFeeMutation = useMutation({
    mutationFn: (id) => base44.entities.Fee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });

  const createInstallmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Installment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      setInstallmentForm({
        amount: '',
        due_date: '',
        status: 'pending',
        payment_method: 'bank',
        installment_number: installments.filter(i => i.fee_id === selectedFee?.id).length + 2
      });
    },
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Installment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
    },
  });

  const openDialog = (fee = null) => {
    if (fee) {
      setEditingFee(fee);
      setFormData({
        project_id: fee.project_id || '',
        project_name: fee.project_name || '',
        client_name: fee.client_name || '',
        total_amount: fee.total_amount || '',
        agreed_date: fee.agreed_date || '',
        status: fee.status || 'draft',
        notes: fee.notes || ''
      });
    } else {
      setEditingFee(null);
      setFormData({
        project_id: '',
        project_name: '',
        client_name: '',
        total_amount: '',
        agreed_date: '',
        status: 'draft',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingFee(null);
  };

  const openInstallmentDialog = (fee) => {
    setSelectedFee(fee);
    setInstallmentForm({
      amount: '',
      due_date: '',
      status: 'pending',
      payment_method: 'bank',
      installment_number: installments.filter(i => i.fee_id === fee.id).length + 1
    });
    setInstallmentDialogOpen(true);
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setFormData({
      ...formData,
      project_id: projectId,
      project_name: project?.name || '',
      client_name: project?.client_name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      total_amount: parseFloat(formData.total_amount)
    };
    if (editingFee) {
      updateFeeMutation.mutate({ id: editingFee.id, data });
    } else {
      createFeeMutation.mutate(data);
    }
  };

  const handleInstallmentSubmit = (e) => {
    e.preventDefault();
    createInstallmentMutation.mutate({
      ...installmentForm,
      fee_id: selectedFee.id,
      amount: parseFloat(installmentForm.amount)
    });
  };

  const toggleInstallmentPaid = async (installment) => {
    if (installment.status === 'paid') {
      // Unpay - just update status
      updateInstallmentMutation.mutate({
        id: installment.id,
        data: {
          status: 'pending',
          paid_date: null
        }
      });
    } else {
      // Pay - use automated function
      try {
        await base44.functions.invoke('processInstallmentPayment', {
          installment_id: installment.id
        });
        queryClient.invalidateQueries({ queryKey: ['installments'] });
        queryClient.invalidateQueries({ queryKey: ['fees'] });
        queryClient.invalidateQueries({ queryKey: ['revenues'] });
        queryClient.invalidateQueries({ queryKey: ['bankcash'] });
        queryClient.invalidateQueries({ queryKey: ['pettycash'] });
      } catch (error) {
        console.error('Errore processamento pagamento:', error);
      }
    }
  };

  // Filter fees
  const today = new Date();
  const filteredFees = useMemo(() => {
    if (activeFilter === 'all') return fees;
    if (activeFilter === 'overdue') {
      return fees.filter(fee => {
        const feeInstallments = installments.filter(i => i.fee_id === fee.id);
        return feeInstallments.some(i => i.status !== 'paid' && i.due_date && isAfter(today, parseISO(i.due_date)));
      });
    }
    return fees.filter(f => f.status === activeFilter);
  }, [fees, installments, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = fees.reduce((sum, f) => sum + (f.total_amount || 0), 0);
    const paid = installments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const overdue = installments
      .filter(i => i.status !== 'paid' && i.due_date && isAfter(today, parseISO(i.due_date)))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    return { total, paid, overdue, pending: total - paid };
  }, [fees, installments]);

  return (
    <div>
      <PageHeader title="Previsionale incassi" description="Gestisci compensi e rate di pagamento">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Compenso
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Compensi Totali</p>
            <p className="text-2xl font-bold text-slate-900">
              €{stats.total.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Pagato</p>
            <p className="text-2xl font-bold text-emerald-600">
              €{stats.paid.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">In Attesa</p>
            <p className="text-2xl font-bold text-amber-600">
              €{stats.pending.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
        <Card className={stats.overdue > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Scaduto</p>
            <p className="text-2xl font-bold text-red-600">
              €{stats.overdue.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          <TabsTrigger value="draft">Bozza</TabsTrigger>
          <TabsTrigger value="agreed">Concordato</TabsTrigger>
          <TabsTrigger value="partial">Parziale</TabsTrigger>
          <TabsTrigger value="paid">Pagato</TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">Scaduto</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Fees Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Caricamento...</div>
      ) : filteredFees.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nessun compenso trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFees.map(fee => (
            <FeeCard
              key={fee.id}
              fee={fee}
              installments={installments}
              onEdit={openDialog}
              onDelete={(id) => deleteFeeMutation.mutate(id)}
              onManageInstallments={openInstallmentDialog}
            />
          ))}
        </div>
      )}

      {/* Fee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Modifica Compenso' : 'Aggiungi Nuovo Compenso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project">Progetto *</Label>
                <div className="flex gap-2">
                  <Select value={formData.project_id} onValueChange={handleProjectChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleziona progetto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({project.client_name || 'Nessun cliente'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Importo Totale (€) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agreed_date">Data Accordo</Label>
                  <Input
                    id="agreed_date"
                    type="date"
                    value={formData.agreed_date}
                    onChange={(e) => setFormData({ ...formData, agreed_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Stato</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Bozza</SelectItem>
                    <SelectItem value="agreed">Concordato</SelectItem>
                    <SelectItem value="partial">Parziale</SelectItem>
                    <SelectItem value="paid">Pagato</SelectItem>
                    <SelectItem value="cancelled">Annullato</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Installment Dialog */}
      <Dialog open={installmentDialogOpen} onOpenChange={setInstallmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestisci Rate - {selectedFee?.project_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Existing installments */}
            <div className="space-y-2">
              <Label>Rate Esistenti</Label>
              {installments.filter(i => i.fee_id === selectedFee?.id).length === 0 ? (
                <p className="text-sm text-slate-500">Nessuna rata ancora</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {installments
                    .filter(i => i.fee_id === selectedFee?.id)
                    .map((inst, idx) => (
                      <div key={inst.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">#{inst.installment_number || idx + 1} - €{inst.amount?.toLocaleString('it-IT')}</p>
                          <p className="text-xs text-slate-500">Scadenza: {inst.due_date}</p>
                        </div>
                        <Button
                          variant={inst.status === 'paid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleInstallmentPaid(inst)}
                        >
                          {inst.status === 'paid' ? <CheckCircle className="h-4 w-4 mr-1" /> : <Clock className="h-4 w-4 mr-1" />}
                          {inst.status === 'paid' ? 'Pagato' : 'Segna Pagato'}
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add new installment */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Aggiungi Nuova Rata</Label>
              <form onSubmit={handleInstallmentSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Importo"
                    value={installmentForm.amount}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, amount: e.target.value })}
                    step="0.01"
                    required
                  />
                  <Input
                    type="date"
                    value={installmentForm.due_date}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={installmentForm.payment_method}
                    onValueChange={(value) => setInstallmentForm({ ...installmentForm, payment_method: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bonifico</SelectItem>
                      <SelectItem value="cash">Contanti</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={createInstallmentMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Aggiungi
                  </Button>
                </div>
              </form>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallmentDialogOpen(false)}>Chiudi</Button>
          </DialogFooter>
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
            project_name: project.name,
            client_name: project.client_name || ''
          });
        }}
      />

      <QuickAddClient
        open={quickAddClientOpen}
        onOpenChange={setQuickAddClientOpen}
        onClientCreated={(client) => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }}
      />
    </div>
  );
}