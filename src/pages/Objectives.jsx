import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ObjectiveCard from '../components/objectives/ObjectiveCard';
import ObjectiveSummary from '../components/objectives/ObjectiveSummary';
import PageHeader from '../components/ui/PageHeader';
import { CATEGORY_LABELS } from '../components/lib/kpiDashboard';

export default function Objectives() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState(null);
  const [progressObjective, setProgressObjective] = useState(null);
  const [newProgress, setNewProgress] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'number',
    target_value: '',
    current_value: '0',
    success_logic: 'higher_better',
    deadline: '',
    category: '',
    description: '',
    status: 'active'
  });

  const queryClient = useQueryClient();

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['objectives'],
    queryFn: () => base44.entities.Objective.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Objective.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Obiettivo creato con successo');
      closeDialog();
    },
    onError: () => toast.error('Errore durante la creazione')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Objective.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Obiettivo aggiornato');
      closeDialog();
      closeProgressDialog();
    },
    onError: () => toast.error('Errore durante l\'aggiornamento')
  });

  const openDialog = (objective = null) => {
    if (objective) {
      setEditingObjective(objective);
      setFormData({
        name: objective.name,
        unit_type: objective.unit_type,
        target_value: objective.target_value.toString(),
        current_value: objective.current_value?.toString() || '0',
        success_logic: objective.success_logic,
        deadline: objective.deadline,
        category: objective.category || '',
        description: objective.description || '',
        status: objective.status
      });
    } else {
      setEditingObjective(null);
      setFormData({
        name: '',
        unit_type: 'number',
        target_value: '',
        current_value: '0',
        success_logic: 'higher_better',
        deadline: '',
        category: '',
        description: '',
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingObjective(null);
  };

  const openProgressDialog = (objective) => {
    setProgressObjective(objective);
    setNewProgress(objective.current_value?.toString() || '0');
    setProgressDialogOpen(true);
  };

  const closeProgressDialog = () => {
    setProgressDialogOpen(false);
    setProgressObjective(null);
    setNewProgress('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      target_value: parseFloat(formData.target_value),
      current_value: parseFloat(formData.current_value)
    };

    if (editingObjective) {
      updateMutation.mutate({ id: editingObjective.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleProgressUpdate = () => {
    if (progressObjective) {
      updateMutation.mutate({
        id: progressObjective.id,
        data: { current_value: parseFloat(newProgress) }
      });
    }
  };

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set();
    objectives.forEach(obj => {
      if (obj.category) cats.add(obj.category);
    });
    return Array.from(cats).sort();
  }, [objectives]);

  // Filtered objectives
  const filteredObjectives = React.useMemo(() => {
    return objectives.filter(obj => {
      if (filterStatus !== 'all' && obj.status !== filterStatus) return false;
      if (filterCategory !== 'all' && obj.category !== filterCategory) return false;
      return true;
    });
  }, [objectives, filterStatus, filterCategory]);

  const activeFiltersCount = [filterStatus, filterCategory].filter(f => f !== 'all').length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Obiettivi e KPI" 
        description="Gestisci obiettivi dinamici con monitoraggio in tempo reale"
      >
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Obiettivo
        </Button>
      </PageHeader>

      <ObjectiveSummary objectives={objectives} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtri:</span>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="active">Attivi</SelectItem>
            <SelectItem value="completed">Completati</SelectItem>
            <SelectItem value="cancelled">Annullati</SelectItem>
          </SelectContent>
        </Select>

        {categories.length > 0 && (
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterStatus('all');
              setFilterCategory('all');
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Rimuovi filtri ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Objectives Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Caricamento...</div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Nessun obiettivo trovato</p>
          <Button onClick={() => openDialog()} className="mt-4">
            Crea il tuo primo obiettivo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredObjectives.map(objective => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onEdit={openDialog}
              onUpdateProgress={openProgressDialog}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingObjective ? 'Modifica Obiettivo' : 'Nuovo Obiettivo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nome Obiettivo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Fatturato Annuo 2026"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_type">Unità di Misura *</Label>
                  <Select
                    value={formData.unit_type}
                    onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="currency">Valuta (€)</SelectItem>
                      <SelectItem value="percentage">Percentuale (%)</SelectItem>
                      <SelectItem value="number">Numero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="success_logic">Logica di Successo *</Label>
                  <Select
                    value={formData.success_logic}
                    onValueChange={(value) => setFormData({ ...formData, success_logic: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="higher_better">Maggiore è meglio</SelectItem>
                      <SelectItem value="lower_better">Minore è meglio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_value">Valore Target *</Label>
                  <Input
                    id="target_value"
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_value">Valore Attuale</Label>
                  <Input
                    id="current_value"
                    type="number"
                    step="0.01"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Scadenza *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">KPI di Riferimento</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona KPI" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrizione dettagliata dell'obiettivo..."
                    rows={3}
                  />
                </div>

                {editingObjective && (
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="status">Stato</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Attivo</SelectItem>
                        <SelectItem value="completed">Completato</SelectItem>
                        <SelectItem value="cancelled">Annullato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingObjective ? 'Aggiorna' : 'Crea Obiettivo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiorna Progresso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {progressObjective && (
              <>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">{progressObjective.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Attuale: {progressObjective.current_value} → Target: {progressObjective.target_value}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progress">Nuovo Valore</Label>
                  <Input
                    id="progress"
                    type="number"
                    step="0.01"
                    value={newProgress}
                    onChange={(e) => setNewProgress(e.target.value)}
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeProgressDialog}>
              Annulla
            </Button>
            <Button onClick={handleProgressUpdate} disabled={updateMutation.isPending}>
              Aggiorna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}