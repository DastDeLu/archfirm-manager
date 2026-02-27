import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Baselines() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState(null);
  const [activeType, setActiveType] = useState('revenue');
  const [formData, setFormData] = useState({
    year: currentYear,
    entity_type: 'revenue',
    entity_id: '',
    entity_name: '',
    baseline_amount: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: baselines = [], isLoading } = useQuery({
    queryKey: ['baselines', selectedYear],
    queryFn: () => base44.entities.Baseline.filter({ year: selectedYear }),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => base44.entities.Chapter.list(),
  });

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Baseline.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Baseline.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Baseline.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines'] });
    },
  });

  const openDialog = (baseline = null) => {
    if (baseline) {
      setEditingBaseline(baseline);
      setFormData(baseline);
    } else {
      setEditingBaseline(null);
      setFormData({
        year: selectedYear,
        entity_type: activeType,
        entity_id: '',
        entity_name: '',
        baseline_amount: '',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBaseline(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      baseline_amount: parseFloat(formData.baseline_amount),
      year: parseInt(formData.year)
    };
    if (editingBaseline) {
      updateMutation.mutate({ id: editingBaseline.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleChapterChange = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    setFormData({
      ...formData,
      entity_id: chapterId,
      entity_name: chapter?.name || ''
    });
  };

  const filteredBaselines = baselines.filter(b => b.entity_type === activeType);

  // Calculate actuals
  const getActual = (baseline) => {
    const yearStr = String(baseline.year);
    if (baseline.entity_type === 'revenue') {
      if (baseline.entity_id) {
        return revenues
          .filter(r => r.chapter_id === baseline.entity_id && r.date?.startsWith(yearStr))
          .reduce((sum, r) => sum + (r.amount || 0), 0);
      }
      return revenues
        .filter(r => r.date?.startsWith(yearStr))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
    } else if (baseline.entity_type === 'expense') {
      if (baseline.entity_id) {
        return expenses
          .filter(e => e.chapter_id === baseline.entity_id && e.date?.startsWith(yearStr))
          .reduce((sum, e) => sum + (e.amount || 0), 0);
      }
      return expenses
        .filter(e => e.date?.startsWith(yearStr))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    } else if (baseline.entity_type === 'chapter' && baseline.entity_id) {
      const chapter = chapters.find(c => c.id === baseline.entity_id);
      if (chapter?.type === 'revenue') {
        return revenues
          .filter(r => r.chapter_id === baseline.entity_id && r.date?.startsWith(yearStr))
          .reduce((sum, r) => sum + (r.amount || 0), 0);
      } else {
        return expenses
          .filter(e => e.chapter_id === baseline.entity_id && e.date?.startsWith(yearStr))
          .reduce((sum, e) => sum + (e.amount || 0), 0);
      }
    }
    return 0;
  };

  return (
    <div>
      <PageHeader title="Budget" description="Imposta e traccia obiettivi finanziari">
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
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Budget
        </Button>
      </PageHeader>

      <Tabs value={activeType} onValueChange={setActiveType} className="mb-6">
        <TabsList>
          <TabsTrigger value="revenue">Ricavi</TabsTrigger>
          <TabsTrigger value="expense">Costi</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Caricamento...</div>
      ) : filteredBaselines.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nessun budget impostato per {activeType === 'revenue' ? 'ricavi' : 'costi'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBaselines.map(baseline => {
            const actual = getActual(baseline);
            const variance = actual - baseline.baseline_amount;
            const percentOfTarget = baseline.baseline_amount > 0 
              ? ((actual / baseline.baseline_amount) * 100).toFixed(1)
              : 0;

            return (
              <Card key={baseline.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {baseline.entity_name || `Total ${baseline.entity_type}`}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">{baseline.year}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDialog(baseline)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => deleteMutation.mutate(baseline.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Obiettivo</p>
                    <p className="text-xl font-bold text-slate-900">
                      €{baseline.baseline_amount.toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Effettivo</p>
                    <p className="text-xl font-bold text-blue-600">
                      €{actual.toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Varianza</p>
                    <p className={`text-lg font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {variance >= 0 ? '+' : ''}€{variance.toLocaleString('it-IT')}
                    </p>
                    <p className={`text-xs ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {percentOfTarget}% dell'obiettivo
                    </p>
                  </div>
                  {baseline.notes && (
                    <p className="text-xs text-slate-600 pt-2 border-t">{baseline.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBaseline ? 'Modifica Budget' : 'Aggiungi Nuovo Budget'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Anno *</Label>
                  <Select
                    value={String(formData.year)}
                    onValueChange={(v) => setFormData({ ...formData, year: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.entity_type}
                    onValueChange={(value) => setFormData({ ...formData, entity_type: value, entity_id: '', entity_name: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Ricavi</SelectItem>
                      <SelectItem value="expense">Costi</SelectItem>
                      <SelectItem value="chapter">Capitolo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.entity_type === 'chapter' && (
                <div className="space-y-2">
                  <Label>Capitolo *</Label>
                  <Select value={formData.entity_id} onValueChange={handleChapterChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona capitolo" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map(chapter => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name} ({chapter.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Importo Budget (€) *</Label>
                <Input
                  type="number"
                  value={formData.baseline_amount}
                  onChange={(e) => setFormData({ ...formData, baseline_amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingBaseline ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}