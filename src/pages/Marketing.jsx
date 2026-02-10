import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { Target, Save } from 'lucide-react';

export default function Marketing() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [yearlyBudget, setYearlyBudget] = useState('');

  const queryClient = useQueryClient();

  const { data: budgetRecord } = useQuery({
    queryKey: ['marketing-yearly', selectedYear],
    queryFn: async () => {
      const records = await base44.entities.MarketingBudget.filter({ year: selectedYear });
      return records.find(r => r.yearly_budget) || null;
    },
  });

  const saveBudgetMutation = useMutation({
    mutationFn: async (budget) => {
      if (budgetRecord) {
        return base44.entities.MarketingBudget.update(budgetRecord.id, {
          yearly_budget: parseFloat(budget)
        });
      } else {
        return base44.entities.MarketingBudget.create({
          year: selectedYear,
          yearly_budget: parseFloat(budget)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-yearly'] });
    },
  });

  const handleSaveBudget = () => {
    if (yearlyBudget) {
      saveBudgetMutation.mutate(yearlyBudget);
    }
  };

  React.useEffect(() => {
    if (budgetRecord?.yearly_budget) {
      setYearlyBudget(budgetRecord.yearly_budget.toString());
    } else {
      setYearlyBudget('');
    }
  }, [budgetRecord]);

  return (
    <div>
      <PageHeader title="Marketing" description="Gestisci il budget marketing annuale">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map(year => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-2 text-slate-700 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Budget Annuale {selectedYear}</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearly-budget">Budget Totale (€)</Label>
              <div className="flex gap-2">
                <Input
                  id="yearly-budget"
                  type="number"
                  value={yearlyBudget}
                  onChange={(e) => setYearlyBudget(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="flex-1"
                />
                <Button 
                  onClick={handleSaveBudget} 
                  disabled={!yearlyBudget || saveBudgetMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Salva
                </Button>
              </div>
            </div>
            {budgetRecord?.yearly_budget && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Budget attuale:</p>
                <p className="text-2xl font-bold text-blue-600">
                  €{budgetRecord.yearly_budget.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}