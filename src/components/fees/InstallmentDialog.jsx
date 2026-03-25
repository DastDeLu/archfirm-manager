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
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const defaultForm = {
  amount: '',
  due_date: '',
  payment_method: 'bank',
  kind: 'rata',
  notes: '',
  calendar_sync_enabled: false,
};

export default function InstallmentDialog({ open, onOpenChange, fee, installment, onSuccess }) {
  const [form, setForm] = useState(defaultForm);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Check if user has Google Calendar connected
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const { data: calendarTokens = [] } = useQuery({
    queryKey: ['userCalendarToken'],
    queryFn: () => base44.entities.UserCalendarToken.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });
  const calendarConnected = calendarTokens.length > 0;

  useEffect(() => {
    if (installment) {
      setForm({
        amount: installment.amount || '',
        due_date: installment.due_date || '',
        payment_method: installment.payment_method || 'bank',
        kind: installment.kind || 'rata',
        notes: installment.notes || '',
        calendar_sync_enabled: installment.calendar_sync_enabled || false,
      });
    } else {
      setForm({ ...defaultForm, amount: fee?.amount || '' });
    }
  }, [installment, fee, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Installment.create(data),
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
    mutationFn: (data) => base44.entities.Installment.update(installment.id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
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
      status: installment?.status || 'pending',
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
                onCheckedChange={(v) => setForm({ ...form, calendar_sync_enabled: v })}
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
  );
}