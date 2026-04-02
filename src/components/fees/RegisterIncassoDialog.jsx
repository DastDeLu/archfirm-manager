import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomTags } from '../hooks/useCustomTags';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/formatters';
import { format } from 'date-fns';
import { Loader2, CheckCircle } from 'lucide-react';

/**
 * Modal di conferma/precompilazione per registrare un ricavo
 * quando una rata viene marcata come pagata.
 */
export default function RegisterIncassoDialog({ open, onOpenChange, installment, fee }) {
  const queryClient = useQueryClient();
  const { revenueTags } = useCustomTags();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    payment_date: '',
    payment_method: 'bank_transfer',
    tag: '',
    description: '',
  });
  const initializedKeyRef = useRef(null);

  useEffect(() => {
    if (!open) {
      initializedKeyRef.current = null;
      return;
    }
    if (!installment || !fee) return;

    const initKey = `${installment.id || 'no-installment'}:${fee.id || 'no-fee'}`;
    if (initializedKeyRef.current === initKey) return;
    initializedKeyRef.current = initKey;

    // Build description
    let desc = 'Incasso compenso';
    if (fee.project_name && fee.client_name) {
      desc = `Incasso compenso - ${fee.project_name} - ${fee.client_name}`;
    } else if (fee.client_name) {
      desc = `Incasso compenso - ${fee.client_name}`;
    }

    // Map installment payment_method to revenue payment_method
    const methodMap = { bank: 'bank_transfer', cash: 'cash', other: 'bank_transfer' };

    // Map fee category to a revenue tag
    const categoryTagMap = {
      'Progettazione': 'Progettazione',
      'Direzione Lavori': 'Direzione Lavori',
      'Pratiche Burocratiche': 'Burocrazia',
      'Provvigioni': 'Provvigione',
    };
    const suggestedTag = categoryTagMap[fee.category] || (revenueTags[0]?.name || 'Incasso Clienti');

    setForm({
      amount: installment.amount || '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: methodMap[installment.payment_method] || 'bank_transfer',
      tag: suggestedTag,
      description: desc,
    });
  }, [open, installment, fee, revenueTags]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await base44.functions.invoke('processInstallmentPayment', {
        installment_id: installment.id,
        payment_date: form.payment_date,
        revenue_description: form.description,
        revenue_tag: form.tag,
        payment_method: form.payment_method,
        amount_override: parseFloat(form.amount),
      });
      toast.success('Pagamento registrato con successo');
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      queryClient.invalidateQueries({ queryKey: ['cashData'] });
      if (fee?.id) {
        queryClient.invalidateQueries({ queryKey: ['installments-by-fee', fee.id] });
        queryClient.invalidateQueries({ queryKey: ['revenues-by-fee', fee.id] });
      }
      onOpenChange(false);
    } catch (err) {
      toast.error('Errore: ' + (err.message || 'Errore sconosciuto'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Registra Incasso
          </DialogTitle>
          {fee && (
            <div className="text-sm text-slate-500 mt-1 space-y-0.5">
              <p>
                Compenso: <strong>{fee.client_name}</strong>
                {fee.project_name && <> · {fee.project_name}</>}
              </p>
              <p>
                Categoria: {fee.category} · Totale: <strong>{formatCurrency(fee.amount || 0)}</strong>
              </p>
            </div>
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
                <Label>Data Pagamento *</Label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metodo Pagamento *</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Banca</SelectItem>
                    <SelectItem value="cash">Contanti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tag Ricavo *</Label>
                <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueTags.length > 0
                      ? revenueTags.map(tag => (
                          <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
                        ))
                      : <>
                          <SelectItem value="Progettazione">Progettazione</SelectItem>
                          <SelectItem value="Direzione Lavori">Direzione Lavori</SelectItem>
                          <SelectItem value="Provvigione">Provvigione</SelectItem>
                          <SelectItem value="Burocrazia">Burocrazia</SelectItem>
                          <SelectItem value="Incasso Clienti">Incasso Clienti</SelectItem>
                        </>
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrizione ricavo..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {isLoading ? 'Registrazione...' : 'Conferma Incasso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}