import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, PiggyBank, Save, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

export default function OpeningBalances() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [bankBalance, setBankBalance] = useState('');
  const [pettyBalance, setPettyBalance] = useState('');
  const [marketingBudget, setMarketingBudget] = useState('');

  const queryClient = useQueryClient();

  const { data: balances = [] } = useQuery({
    queryKey: ['openingBalances', selectedYear],
    queryFn: () => base44.entities.OpeningBalance.filter({ year: selectedYear }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ type, amount }) => {
      const existing = balances.find(b => b.type === type && b.year === selectedYear);
      if (existing) {
        return base44.entities.OpeningBalance.update(existing.id, {
          amount: parseFloat(amount),
          updated_date: new Date().toISOString().split('T')[0]
        });
      } else {
        return base44.entities.OpeningBalance.create({
          type,
          year: selectedYear,
          amount: parseFloat(amount),
          updated_date: new Date().toISOString().split('T')[0]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openingBalances'] });
      toast.success('Saldo iniziale salvato');
    },
  });

  React.useEffect(() => {
    const bankBal = balances.find(b => b.type === 'bank');
    const pettyBal = balances.find(b => b.type === 'petty');
    const marketingBal = balances.find(b => b.type === 'marketing_budget');
    setBankBalance(bankBal?.amount?.toString() || '');
    setPettyBalance(pettyBal?.amount?.toString() || '');
    setMarketingBudget(marketingBal?.amount?.toString() || '');
  }, [balances]);

  const handleSaveBank = () => {
    if (bankBalance) {
      saveMutation.mutate({ type: 'bank', amount: bankBalance });
    }
  };

  const handleSavePetty = () => {
    if (pettyBalance) {
      saveMutation.mutate({ type: 'petty', amount: pettyBalance });
    }
  };

  const handleSaveMarketing = () => {
    if (marketingBudget) {
      saveMutation.mutate({ type: 'marketing_budget', amount: marketingBudget });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saldi Iniziali</CardTitle>
          <CardDescription>Configura i saldi di apertura per i conti cassa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="year">Anno</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="bank" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  Cassa Banca (€)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="bank"
                    type="number"
                    value={bankBalance}
                    onChange={(e) => setBankBalance(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSaveBank} 
                    disabled={!bankBalance || saveMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salva
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="petty" className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-amber-600" />
                  Cassa Contanti (€)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="petty"
                    type="number"
                    value={pettyBalance}
                    onChange={(e) => setPettyBalance(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSavePetty} 
                    disabled={!pettyBalance || saveMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salva
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketing" className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                  Budget Marketing Annuale (€)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="marketing"
                    type="number"
                    value={marketingBudget}
                    onChange={(e) => setMarketingBudget(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSaveMarketing} 
                    disabled={!marketingBudget || saveMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salva
                  </Button>
                </div>
              </div>
            </div>

            {balances.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm font-medium text-slate-700">Saldi Configurati per {selectedYear}:</p>
                <div className="space-y-1 text-sm text-slate-600">
                  {balances.find(b => b.type === 'bank') && (
                    <p>• Banca: €{balances.find(b => b.type === 'bank').amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  )}
                  {balances.find(b => b.type === 'petty') && (
                    <p>• Contanti: €{balances.find(b => b.type === 'petty').amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  )}
                  {balances.find(b => b.type === 'marketing_budget') && (
                    <p>• Budget Marketing: €{balances.find(b => b.type === 'marketing_budget').amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}