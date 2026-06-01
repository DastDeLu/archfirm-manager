import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Save,
  Layers,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { withOwner } from '@/lib/withOwner';

// Ciclo stati: pending -> paid -> overdue -> pending
const STATUS_CYCLE = ['pending', 'paid', 'overdue'];
const STATUS_CONFIG = {
  pending: { label: 'Da pagare', color: 'text-amber-500', bg: 'bg-amber-50' },
  paid:    { label: 'Pagata',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  overdue: { label: 'Scaduta',   color: 'text-red-500', bg: 'bg-red-50' },
};

function nextStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function StatusIcon({ status, onClick, disabled }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={cfg.label}
      className={cn(
        'rounded-full p-1 transition-colors',
        cfg.bg,
        cfg.color,
        !disabled && 'hover:opacity-75 cursor-pointer',
        disabled && 'cursor-default opacity-60'
      )}
    >
      <DollarSign className="h-3.5 w-3.5" />
    </button>
  );
}

export default function InstallmentsTableDialog({ open, onOpenChange, fee, targetInstallmentId, onTargetHandled }) {
  const queryClient = useQueryClient();
  const [uid, setUid] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { inst, newStatus }
  const [rows, setRows] = useState([]); // local ordered list for DnD

  // Get current user id
  useEffect(() => {
    base44.auth.me().then(u => setUid(u?.id ?? null)).catch(() => {});
  }, []);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['installments-by-fee', fee.id] });
    queryClient.invalidateQueries({ queryKey: ['all-revenues-for-fees'] });
    queryClient.invalidateQueries({ queryKey: ['fees'] });
  }, [queryClient, fee.id]);

  const { data: installments = [], isLoading } = useQuery({
    queryKey: ['installments-by-fee', fee.id],
    queryFn: () => base44.entities.Installment.filter({ fee_id: fee.id }),
    enabled: open,
  });

  // Sync remote data -> local rows (sorted by installment_number)
  // Non sovrascrivere se c'è una riga in editing per non perdere il draft
  useEffect(() => {
    if (!isLoading && !editingId) {
      const sorted = [...installments].sort(
        (a, b) => (a.installment_number ?? 999) - (b.installment_number ?? 999)
      );
      setRows(sorted);
    }
  }, [installments, isLoading, editingId]);

  // Deep-link: open target in edit mode
  useEffect(() => {
    if (!open || !targetInstallmentId || isLoading || rows.length === 0) return;
    const target = rows.find(r => r.id === targetInstallmentId);
    if (target) {
      startEdit(target);
      onTargetHandled?.();
    }
  }, [open, targetInstallmentId, isLoading, rows]);

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const nextNum = rows.length > 0
        ? Math.max(...rows.map(r => r.installment_number ?? 0)) + 1
        : 1;
      const data = withOwner({
        fee_id: fee.id,
        amount: fee.amount || 0,
        due_date: '',
        notes: '',
        payment_method: 'bank',
        kind: 'rata',
        status: 'pending',
        installment_number: nextNum,
      }, uid);
      return base44.entities.Installment.create(data);
    },
    onSuccess: (newInst) => {
      // Aggiungi ottimisticamente in fondo prima del refetch
      setRows(prev => [...prev, newInst]);
      // Entra subito in modalità edit
      setEditingId(newInst.id);
      setEditDraft({ notes: newInst.notes || '', due_date: newInst.due_date || '', amount: newInst.amount || '' });
      toast.success('Rata aggiunta');
      invalidateAll();
    },
    onError: (err) => toast.error('Errore: ' + err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }) => {
      await base44.entities.Installment.update(id, patch);
    },
    onSuccess: () => {
      setEditingId(null);
      setEditDraft({});
      invalidateAll();
    },
    onError: (err) => toast.error('Errore aggiornamento: ' + err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ inst, newStatus }) => {
      if (newStatus === 'paid') {
        const today = new Date().toISOString().split('T')[0];
        const res = await base44.functions.invoke('syncInstallmentRevenuePair', {
          origin: 'installment',
          installment_id: inst.id,
          installment_patch: { status: 'paid', paid_date: today },
        });
        const body = res?.data ?? res;
        if (body?.error) throw new Error(typeof body.error === 'string' ? body.error : JSON.stringify(body.error));
      } else {
        await base44.entities.Installment.update(inst.id, { status: newStatus, paid_date: '' });
      }
    },
    onSuccess: () => {
      invalidateAll();
      setPendingStatusChange(null);
      toast.success('Stato aggiornato');
    },
    onError: (err) => {
      toast.error('Errore: ' + err.message);
      setPendingStatusChange(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered) => {
      await Promise.all(
        reordered.map((inst, idx) =>
          base44.entities.Installment.update(inst.id, { installment_number: idx + 1 })
        )
      );
    },
    onSuccess: () => invalidateAll(),
    onError: (err) => toast.error('Errore riordino: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('syncInstallmentRevenuePair', {
        action: 'delete_installment',
        installment_id: id,
      });
      const body = res?.data ?? res;
      if (body?.error) throw new Error(typeof body.error === 'string' ? body.error : JSON.stringify(body.error));
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteConfirmId(null);
      toast.success('Rata eliminata');
    },
    onError: (err) => {
      toast.error('Errore eliminazione: ' + err.message);
      setDeleteConfirmId(null);
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const startEdit = (inst) => {
    setEditingId(inst.id);
    setEditDraft({ notes: inst.notes || '', due_date: inst.due_date || '', amount: inst.amount || '' });
  };

  const saveEdit = (id) => {
    if (!editDraft.notes || !editDraft.notes.trim()) {
      toast.error('La descrizione della rata è obbligatoria');
      return;
    }
    updateMutation.mutate({
      id,
      patch: {
        notes: editDraft.notes,
        due_date: editDraft.due_date,
        amount: parseFloat(editDraft.amount) || 0,
      },
    });
  };

  const handleStatusClick = (inst) => {
    const newStatus = nextStatus(inst.status || 'pending');
    if (newStatus === 'paid') {
      if (!inst.notes || !inst.notes.trim()) {
        toast.error('Aggiungi una descrizione alla rata prima di segnarla come pagata');
        return;
      }
      setPendingStatusChange({ inst, newStatus });
    } else {
      statusMutation.mutate({ inst, newStatus });
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(rows);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setRows(reordered);
    reorderMutation.mutate(reordered);
  };

  const isBusy = createMutation.isPending || reorderMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <DialogTitle className="text-base font-semibold uppercase tracking-wide text-blue-700">
                  Rate / Acconti
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2 mr-6">
                <span className="text-xs text-slate-500">
                  {fee.client_name}{fee.project_name ? ` · ${fee.project_name}` : ''}
                </span>
                <span className="text-xs font-semibold text-slate-700">{formatCurrency(fee.amount || 0)}</span>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="mt-2">
              {/* Table header */}
              <div className="grid grid-cols-[24px_28px_28px_1fr_140px_110px_80px] gap-2 px-2 pb-1 border-b border-slate-200">
                <div />
                <div />
                <div className="text-[10px] font-semibold text-slate-400 uppercase">#</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Descrizione</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Scadenza</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase text-right">Importo (€)</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase text-right">Azioni</div>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  Nessuna rata. Clicca "+ Aggiungi Rata" per iniziare.
                </p>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="installments">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="divide-y divide-slate-100"
                      >
                        {rows.map((inst, idx) => {
                          const isEditing = editingId === inst.id;
                          const isSaving = updateMutation.isPending && editingId === inst.id;
                          const isStatusChanging = statusMutation.isPending &&
                            pendingStatusChange?.inst?.id === inst.id;

                          return (
                            <Draggable key={inst.id} draggableId={inst.id} index={idx}>
                              {(drag, snapshot) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  className={cn(
                                    'grid grid-cols-[24px_28px_28px_1fr_140px_110px_80px] gap-2 items-center px-2 py-1.5 transition-colors',
                                    snapshot.isDragging && 'bg-blue-50 shadow-md rounded-lg',
                                    !snapshot.isDragging && 'hover:bg-slate-50'
                                  )}
                                >
                                  {/* Drag handle */}
                                  <div {...drag.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500 flex items-center">
                                    <GripVertical className="h-4 w-4" />
                                  </div>

                                  {/* Status icon */}
                                  <div>
                                    <StatusIcon
                                      status={inst.status || 'pending'}
                                      onClick={() => handleStatusClick(inst)}
                                      disabled={isStatusChanging || statusMutation.isPending}
                                    />
                                  </div>

                                  {/* # */}
                                  <div className="text-xs text-slate-400 font-mono">{idx + 1}</div>

                                  {/* Descrizione */}
                                  <div>
                                    {isEditing ? (
                                      <Input
                                        value={editDraft.notes}
                                        onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                                        placeholder="Descrizione (obbligatoria)..."
                                        className="h-7 text-xs"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-700 truncate block">
                                        {inst.notes || <span className="text-slate-300 italic">—</span>}
                                      </span>
                                    )}
                                  </div>

                                  {/* Scadenza */}
                                  <div>
                                    {isEditing ? (
                                      <Input
                                        type="date"
                                        value={editDraft.due_date}
                                        onChange={e => setEditDraft(d => ({ ...d, due_date: e.target.value }))}
                                        className="h-7 text-xs"
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-600">{inst.due_date || '—'}</span>
                                    )}
                                  </div>

                                  {/* Importo */}
                                  <div className="text-right">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={editDraft.amount}
                                        onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))}
                                        className="h-7 text-xs text-right"
                                      />
                                    ) : (
                                      <span className="text-xs font-semibold text-slate-800">
                                        {formatCurrency(inst.amount || 0)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Azioni */}
                                  <div className="flex items-center justify-end gap-0.5">
                                    {isEditing ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs gap-1"
                                        onClick={() => saveEdit(inst.id)}
                                        disabled={isSaving}
                                      >
                                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        Salva
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => startEdit(inst)}
                                      >
                                        <Pencil className="h-3 w-3 text-slate-400" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-400 hover:text-red-600"
                                      onClick={() => setDeleteConfirmId(inst.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}

              {/* Add row button */}
              <div className="mt-3 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-blue-700 border-blue-200 hover:bg-blue-50 text-xs"
                  onClick={() => createMutation.mutate()}
                  disabled={isBusy}
                >
                  {createMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />}
                  Aggiungi Rata
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Conferma cambio stato -> paid */}
      <AlertDialog
        open={!!pendingStatusChange && pendingStatusChange.newStatus === 'paid'}
        onOpenChange={(v) => !v && setPendingStatusChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Segnare come pagata?</AlertDialogTitle>
            <AlertDialogDescription>
              Verrà registrato un incasso e aggiornata la cassa. L'azione non è reversibile automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={statusMutation.isPending}
              onClick={() => pendingStatusChange && statusMutation.mutate(pendingStatusChange)}
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conferma eliminazione */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa rata?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La rata e il ricavo collegato verranno rimossi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}