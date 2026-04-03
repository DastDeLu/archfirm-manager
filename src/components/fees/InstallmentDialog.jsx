import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { withOwner } from '@/lib/withOwner';
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

const defaultForm = {
  amount: '',
  due_date: '',
  payment_method: 'bank',
  kind: 'rata',
  status: 'pending',
  paid_date: '',
  notes: '',
  calendar_sync_enabled: false,
};

export default function InstallmentDialog({ open, onOpenChange, fee, installment, onSuccess }) {
  const [form, setForm] = useState(defaultForm);
  const [syncing, setSyncing] = useState(false);
  const [showCalendarConsent, setShowCalendarConsent] = useState(false);
  const queryClient = useQueryClient();
  const uid = useCurrentUserId();

  // Check if Google Calendar connector is active
  const { data: calendarStatus } = useQuery({
    queryKey: ['calendarConnectorStatus'],
    queryFn: async () => {
      const res = await base44.functions.invoke('checkCalendarConnection', {});
      return res.data;
    },
    retry: false,
  });
  const calendarConnected = calendarStatus?.connected === true;
  useEffect(() => {
    if (installment) {
      setForm({
        amount: installment.amount || '',
        due_date: installment.due_date || '',
        payment_method: installment.payment_method || 'bank',
        kind: installment.kind || 'rata',
        status: installment.status || 'pending',
        paid_date: installment.paid_date || '',
        notes: installment.notes || '',
        calendar_sync_enabled: installment.calendar_sync_enabled || false,
      });
    } else {
      setForm({ ...defaultForm, amount: fee?.amount || '', status: 'pending', paid_date: '' });
    }
  }, [installment, fee, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Installment.create(withOwner(data, uid)),
    onSuccess: async (newInst) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      // Sync to Calendar if enabled
      if (form.calendar_sync_enabled && calendarConnected) {
        await syncCalendar(newInst.id, 'create');
      }
      toast.success('Rata aggiunta');
      onSuccess?.();
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (data.status === 'paid') {
        await base44.functions.invoke('syncInstallmentRevenuePair', {
          origin: 'installment',
          installment_id: installment.id,
          installment_patch: data,
        });
      } else {
        await base44.entities.Installment.update(installment.id, data);
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      if (fee?.id) {
        queryClient.invalidateQueries({ queryKey: ['revenues-by-fee', fee.id] });
      }
      // Sync to Calendar if enabled (update existing event)
      if (calendarConnected) {
        const action = form.calendar_sync_enabled ? 'update' : 'delete';
        await syncCalendar(installment.id, action);
      }
      toast.success('Rata aggiornata');
      onSuccess?.();
      onOpenChange(false);
    },
  });

  const syncCalendar = async (installmentId, action) => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncInstallmentCalendarEvent', {
        installment_id: installmentId,
        action,
      });
    } catch (err) {
      toast.warning('Rata salvata, ma sync Calendar fallito: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      fee_id: fee?.id,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      payment_method: form.payment_method,
      kind: form.kind,
      notes: form.notes,
      calendar_sync_enabled: form.calendar_sync_enabled,
      status: form.status,
      paid_date: form.status === 'paid' ? (form.paid_date || new Date().toISOString().split('T')[0]) : '',
      installment_number: installment?.installment_number,
    };
    if (installment) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || syncing;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{installment ? 'Modifica Rata' : 'Aggiungi Rata / Acconto'}</DialogTitle>
          {fee && (
            <p className="text-sm text-slate-500 mt-1">
              Compenso: <strong>{fee.client_name}</strong>
              {fee.project_name && <> · {fee.project_name}</>}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acconto">Acconto</SelectItem>
                  <SelectItem value="rata">Rata</SelectItem>
                  <SelectItem value="saldo">Saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Scadenza *</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Metodo Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banca</SelectItem>
                  <SelectItem value="cash">Contanti</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stato pagamento */}
            <div className="space-y-2">
              <Label>Stato Pagamento *</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v, paid_date: v === 'paid' ? (form.paid_date || new Date().toISOString().split('T')[0]) : '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Da pagare</SelectItem>
                  <SelectItem value="paid">Pagata</SelectItem>
                  <SelectItem value="overdue">Scaduta</SelectItem>
                  <SelectItem value="cancelled">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.status === 'paid' && (
              <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Input
                  type="date"
                  value={form.paid_date}
                  onChange={(e) => setForm({ ...form, paid_date: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Note opzionali..."
              />
            </div>

            {/* Google Calendar toggle */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${calendarConnected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Sync Google Calendar</p>
                  <p className="text-xs text-slate-500">
                    {calendarConnected ? 'Crea evento con promemoria' : 'Collega Calendar in Impostazioni'}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.calendar_sync_enabled}
                onCheckedChange={(v) => {
                  if (v && !form.calendar_sync_enabled) {
                    setShowCalendarConsent(true);
                  } else {
                    setForm({ ...form, calendar_sync_enabled: v });
                  }
                }}
                disabled={!calendarConnected}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {installment ? 'Aggiorna' : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showCalendarConsent} onOpenChange={setShowCalendarConsent}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Sincronizzazione Google Calendar
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                Attivando questa opzione, verrà creato un <strong>evento nel Google Calendar dello studio</strong> con la data di scadenza di questa rata.
              </p>
              <p>
                L'evento include un promemoria automatico e verrà aggiornato o rimosso se modifichi o cancelli la rata.
              </p>
              <p className="text-slate-500 italic">
                Il calendario utilizzato è quello condiviso dello studio, non il tuo calendario personale.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCalendarConsent(false)}>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            setForm(f => ({ ...f, calendar_sync_enabled: true }));
            setShowCalendarConsent(false);
          }}>
            Attiva Sync
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}