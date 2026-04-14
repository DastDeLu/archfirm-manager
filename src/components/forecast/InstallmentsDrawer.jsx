import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExternalLink, AlertCircle, CheckCircle, Clock, Calendar, Pencil, Trash2, Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import InstallmentDialog from '../fees/InstallmentDialog';
import RegisterIncassoDialog from '../fees/RegisterIncassoDialog';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const statusLabels = {
  pending: 'Da pagare',
  paid: 'Pagata',
  overdue: 'Scaduta',
  cancelled: 'Annullata',
};

const statusIcons = {
  pending: Clock,
  paid: CheckCircle,
  overdue: AlertCircle,
  cancelled: Clock,
};

const kindLabels = {
  acconto: 'Acconto',
  rata: 'Rata',
  saldo: 'Saldo',
};

const kindColors = {
  acconto: 'bg-blue-100 text-blue-700',
  rata: 'bg-slate-100 text-slate-600',
  saldo: 'bg-purple-100 text-purple-700',
};

export default function InstallmentsDrawer({ open, onOpenChange, installments, fees, selectedYear }) {
  const [statusFilter, setStatusFilter] = useState('pending_overdue');
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [incassoInstallment, setIncassoInstallment] = useState(null);
  const [incassoFee, setIncassoFee] = useState(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Installment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      toast.success('Rata eliminata');
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      toast.error('Errore durante l\'eliminazione della rata: ' + (err?.message || 'Errore sconosciuto'));
      setDeleteConfirmId(null);
    },
  });

  const handleEdit = (inst) => {
    const fee = fees.find(f => f.id === inst.fee_id) || null;
    setEditingInstallment(inst);
    setEditingFee(fee);
    setEditDialogOpen(true);
  };

  const handleSegnaPagato = (inst) => {
    const fee = fees.find(f => f.id === inst.fee_id) || null;
    setIncassoInstallment(inst);
    setIncassoFee(fee);
  };

  // Arricchisce le rate con dati del compenso
  const enrichedInstallments = useMemo(() => {
    const feeMap = {};
    fees.forEach(f => { feeMap[f.id] = f; });

    return installments
      .filter(i => {
        const yearMatch = !selectedYear || (i.due_date && i.due_date.startsWith(String(selectedYear)));
        return yearMatch;
      })
      .map(i => ({
        ...i,
        fee: feeMap[i.fee_id] || null,
        client_name: feeMap[i.fee_id]?.client_name || '—',
        project_name: feeMap[i.fee_id]?.project_name || '—',
      }))
      .sort((a, b) => {
        // Acconti prima, poi per data
        if (a.kind === 'acconto' && b.kind !== 'acconto') return -1;
        if (b.kind === 'acconto' && a.kind !== 'acconto') return 1;
        return (a.due_date || '').localeCompare(b.due_date || '');
      });
  }, [installments, fees, selectedYear]);

  const filtered = useMemo(() => {
    switch (statusFilter) {
      case 'pending_overdue': return enrichedInstallments.filter(i => i.status === 'pending' || i.status === 'overdue');
      case 'paid': return enrichedInstallments.filter(i => i.status === 'paid');
      case 'overdue': return enrichedInstallments.filter(i => i.status === 'overdue');
      case 'all': return enrichedInstallments;
      default: return enrichedInstallments;
    }
  }, [enrichedInstallments, statusFilter]);

  // Totali
  const totals = useMemo(() => {
    const daIncassare = enrichedInstallments
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .reduce((s, i) => s + (i.amount || 0), 0);
    const incassati = enrichedInstallments
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + (i.amount || 0), 0);
    return { daIncassare, incassati };
  }, [enrichedInstallments]);

  // Raggruppa per compenso
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(i => {
      const key = i.fee_id || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          fee: i.fee,
          client_name: i.client_name,
          project_name: i.project_name,
          items: [],
        };
      }
      groups[key].items.push(i);
    });
    return Object.values(groups);
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b bg-slate-50">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            Incassi da Compensi — {selectedYear}
          </SheetTitle>
          {/* Totali */}
          <div className="flex gap-4 mt-2">
            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-600 font-medium">Da Incassare</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(totals.daIncassare)}</p>
            </div>
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs text-emerald-600 font-medium">Incassati</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(totals.incassati)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4 border-b">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_overdue">Da saldare</SelectItem>
              <SelectItem value="overdue">Solo scadute</SelectItem>
              <SelectItem value="paid">Saldate</SelectItem>
              <SelectItem value="all">Tutte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 space-y-4">
          {grouped.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nessuna rata trovata</p>
            </div>
          ) : (
            grouped.map((group, gi) => (
              <div key={gi} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Header compenso */}
                <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{group.client_name}</p>
                    {group.project_name !== '—' && (
                      <p className="text-xs text-slate-500">{group.project_name}</p>
                    )}
                    {group.fee && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Compenso totale: {formatCurrency(group.fee.amount || 0)} · {group.fee.category}
                      </p>
                    )}
                  </div>
                  <Link to="/Fees">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600 hover:text-blue-700">
                      <ExternalLink className="h-3 w-3" />
                      Apri
                    </Button>
                  </Link>
                </div>
                {/* Rate */}
                <div className="divide-y divide-slate-100">
                  {group.items.map(inst => {
                    const Icon = statusIcons[inst.status] || Clock;
                    return (
                      <div key={inst.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            inst.status === 'paid' ? 'text-emerald-500' :
                            inst.status === 'overdue' ? 'text-red-500' : 'text-amber-500'
                          )} />
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {inst.kind && inst.kind !== 'rata' && (
                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", kindColors[inst.kind])}>
                                  {kindLabels[inst.kind]}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {inst.due_date ? format(new Date(inst.due_date), 'dd/MM/yyyy') : '—'}
                              </span>
                              {inst.installment_number && (
                                <span className="text-xs text-slate-400">· #{inst.installment_number}</span>
                              )}
                              {inst.google_event_id && (
                                <Calendar className="h-3 w-3 text-blue-400" title="Sincronizzato con Calendar" />
                              )}
                            </div>
                            {inst.notes && (
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">{inst.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs border", statusColors[inst.status])}>
                            {statusLabels[inst.status]}
                          </Badge>
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(inst.amount || 0)}</span>
                          {inst.status !== 'paid' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-700" onClick={() => handleSegnaPagato(inst)} title="Segna Pagato">
                              <Banknote className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(inst)}>
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => setDeleteConfirmId(inst.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>

      <InstallmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        fee={editingFee}
        installment={editingInstallment}
        onSuccess={() => {
          setEditingInstallment(null);
          setEditingFee(null);
        }}
      />

      <RegisterIncassoDialog
        open={!!incassoInstallment}
        onOpenChange={(v) => { if (!v) { setIncassoInstallment(null); setIncassoFee(null); } }}
        installment={incassoInstallment}
        fee={incassoFee}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa rata?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La rata verrà rimossa definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending || !deleteConfirmId}
              onClick={() => {
                if (deleteConfirmId && !deleteMutation.isPending) {
                  deleteMutation.mutate(deleteConfirmId);
                }
              }}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}