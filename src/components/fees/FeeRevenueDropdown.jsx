import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, ArrowDownCircle, CheckCircle, Clock, Calendar, Layers, Pencil, Trash2, Banknote } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import InstallmentDialog from './InstallmentDialog';
import RegisterIncassoDialog from './RegisterIncassoDialog';

/**
 * Dropdown per un singolo compenso (Fee) che mostra i ricavi collegati
 * e permette di aggiungere un nuovo incasso.
 */
export default function FeeRevenueDropdown({ fee, onAddIncasso }) {
  const [open, setOpen] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [incassoInstallment, setIncassoInstallment] = useState(null);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Installment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['installments-by-fee', fee.id] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      toast.success('Rata eliminata');
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      toast.error('Errore durante l\'eliminazione della rata: ' + (err?.message || 'Errore sconosciuto'));
      setDeleteConfirmId(null);
    },
  });

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues-by-fee', fee.id],
    queryFn: () => base44.entities.Revenue.filter({ fee_id: fee.id }),
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments-by-fee', fee.id],
    queryFn: () => base44.entities.Installment.filter({ fee_id: fee.id }),
  });

  const totalIncassato = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  const remaining = (fee.amount || 0) - totalIncassato;
  const isFullyCollected = fee.payment_status === 'Incassati';

  return (
    <>
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex flex-col items-end gap-1 cursor-pointer">
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border",
              isFullyCollected
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            )}
          >
            {isFullyCollected ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            <span>{formatCurrency(fee.amount || 0)}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
          <div className="flex gap-3 text-[11px] pr-1">
            <span className="text-emerald-600 font-medium">✓ {formatCurrency(totalIncassato)}</span>
            {remaining > 0 && (
              <span className="text-amber-600 font-medium">⏳ {formatCurrency(remaining)}</span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden min-w-[280px]">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Incassi registrati</span>
            {!isFullyCollected && (
              <span className="text-xs text-amber-600 font-medium">
                Rimanente: {formatCurrency(remaining)}
              </span>
            )}
          </div>

          {/* Revenue list */}
          <div className="divide-y divide-slate-100">
            {revenues.length === 0 ? (
              <p className="text-xs text-slate-400 px-3 py-3 text-center">Nessun incasso registrato</p>
            ) : (
              revenues.map(rev => (
                <div key={rev.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-500">{rev.date}</p>
                    {rev.description && (
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{rev.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrency(rev.amount || 0)}</p>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {rev.payment_method === 'bank_transfer' ? 'Banca' : 'Contanti'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rate / Acconti section */}
          {installments.length > 0 && (
            <>
              <div className="px-3 py-2 bg-blue-50 border-t border-b border-slate-200 flex items-center gap-1">
                <Layers className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Rate / Acconti</span>
              </div>
              {installments
                .sort((a, b) => {
                  if (a.kind === 'acconto' && b.kind !== 'acconto') return -1;
                  if (b.kind === 'acconto' && a.kind !== 'acconto') return 1;
                  return (a.due_date || '').localeCompare(b.due_date || '');
                })
                .map(inst => (
                  <div key={inst.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          inst.kind === 'acconto' ? 'bg-blue-100 text-blue-700' :
                          inst.kind === 'saldo' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {inst.kind === 'acconto' ? 'Acconto' : inst.kind === 'saldo' ? 'Saldo' : 'Rata'}
                        </span>
                        {inst.google_event_id && (
                          <Calendar className="h-3 w-3 text-blue-400" title="Sync Calendar attivo" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{inst.due_date || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(inst.amount || 0)}</p>
                        <span className={cn(
                          "text-[10px] font-medium",
                          inst.status === 'paid' ? 'text-emerald-600' :
                          inst.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                        )}>
                          {inst.status === 'paid' ? 'Pagata' : inst.status === 'overdue' ? 'Scaduta' : 'Da pagare'}
                        </span>
                      </div>
                      {inst.status !== 'paid' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); setIncassoInstallment(inst); }} title="Segna Pagato">
                          <Banknote className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingInstallment(inst); setInstallmentDialogOpen(true); }}>
                        <Pencil className="h-3 w-3 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(inst.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              }
            </>
          )}

          {/* Action buttons */}
          {!isFullyCollected && (
            <div className="p-2 border-t border-slate-200 flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  setInstallmentDialogOpen(true);
                }}
              >
                <Layers className="h-3 w-3" />
                Aggiungi Rata
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAddIncasso(fee);
                }}
              >
                <Plus className="h-3 w-3" />
                Incasso
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>

    <InstallmentDialog
      open={installmentDialogOpen}
      onOpenChange={(v) => { setInstallmentDialogOpen(v); if (!v) setEditingInstallment(null); }}
      fee={fee}
      installment={editingInstallment}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['installments'] });
        queryClient.invalidateQueries({ queryKey: ['installments-by-fee', fee.id] });
        setEditingInstallment(null);
      }}
    />

    <RegisterIncassoDialog
      open={!!incassoInstallment}
      onOpenChange={(v) => { if (!v) setIncassoInstallment(null); }}
      installment={incassoInstallment}
      fee={fee}
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
    </>
  );
}