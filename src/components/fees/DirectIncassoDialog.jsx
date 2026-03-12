import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/formatters';

/**
 * Dialog per registrare un incasso diretto su un compenso (Fee).
 * Chiama la function createDirectIncasso.
 */
export default function DirectIncassoDialog({ open, onOpenChange, fee }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Banca',
    description: '',
    tag: 'Incasso Clienti'
  });

  // Pre-popola importo quando la fee cambia
  useEffect(() => {
    if (fee) {
      setForm(prev => ({
        ...prev,
        amount: fee.amount || '',
        description: `Incasso compenso - ${fee.client_name || 'Cliente'}`
      }));
    }
  }, [fee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await base44.functions.invoke('createDirectIncasso', {
        fee_id: fee?.id,
        amount: parseFloat(form.amount),
        date: form.date,
        payment_method: form.payment_method,
        description: form.description
      });
      toast.success('Incasso registrato con successo');
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      if (fee?.id) {
        queryClient.invalidateQueries({ queryKey: ['revenues-by-fee', fee.id] });
      }
      onOpenChange(false);
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], payment_method: 'Banca', description: '' });
    } catch (err) {
      toast.error('Errore durante la registrazione: ' + (err.message || 'Errore sconosciuto'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registra Incasso</DialogTitle>
          {fee && (
            <p className="text-sm text-slate-500 mt-1">
              Compenso: <strong>{fee.client_name}</strong> – {fee.category}
              {fee.amount && <> · Totale: <strong>{formatCurrency(fee.amount)}</strong></>}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Metodo Pagamento *</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Banca">Banca</SelectItem>
                  <SelectItem value="Contanti">Contanti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrizione incasso..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Registrazione...' : 'Registra Incasso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}