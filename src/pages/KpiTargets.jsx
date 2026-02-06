import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '../components/ui/DataTable';
import { KPI_DEFINITIONS } from '../components/lib/kpiDashboard';
import { Plus, Target, Shield } from 'lucide-react';
import { toast } from 'sonner';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';

export default function KpiTargets() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [formData, setFormData] = useState({
    kpi_id: '',
    period_type: 'monthly',
    year: new Date().getFullYear(),
    quarter: 1,
    month: new Date().getMonth() + 1,
    target_ok: '',
    target_attention: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          toast.error('Solo gli amministratori possono gestire gli obiettivi KPI');
        }
      } catch (e) {
        console.log('User not authenticated');
      }
    };
    loadUser();
  }, []);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['kpiTargets'],
    queryFn: () => base44.entities.KpiTarget.list('-year', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KpiTarget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiTargets'] });
      toast.success('Obiettivo creato');
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KpiTarget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiTargets'] });
      toast.success('Obiettivo aggiornato');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KpiTarget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpiTargets'] });
      toast.success('Obiettivo eliminato');
    },
  });

  const openDialog = (target = null) => {
    if (target) {
      setEditingTarget(target);
      setFormData({
        kpi_id: target.kpi_id,
        period_type: target.period_type,
        year: target.year,
        quarter: target.quarter || 1,
        month: target.month || new Date().getMonth() + 1,
        target_ok: target.target_ok,
        target_attention: target.target_attention,
        notes: target.notes || ''
      });
    } else {
      setEditingTarget(null);
      setFormData({
        kpi_id: '',
        period_type: 'monthly',
        year: new Date().getFullYear(),
        quarter: 1,
        month: new Date().getMonth() + 1,
        target_ok: '',
        target_attention: '',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTarget(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      target_ok: parseFloat(formData.target_ok),
      target_attention: parseFloat(formData.target_attention),
    };

    // Remove unnecessary fields based on period type
    if (data.period_type === 'annual') {
      delete data.quarter;
      delete data.month;
    } else if (data.period_type === 'quarterly') {
      delete data.month;
    } else {
      delete data.quarter;
    }

    if (editingTarget) {
      updateMutation.mutate({ id: editingTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPeriodLabel = (target) => {
    if (target.period_type === 'monthly') {
      return `${target.month}/${target.year}`;
    } else if (target.period_type === 'quarterly') {
      return `Q${target.quarter} ${target.year}`;
    } else {
      return `${target.year}`;
    }
  };

  const columns = [
    {
      key: 'kpi_id',
      label: 'KPI',
      render: (value) => KPI_DEFINITIONS[value]?.label || value,
    },
    {
      key: 'period_type',
      label: 'Periodo',
      render: (value, row) => getPeriodLabel(row),
    },
    {
      key: 'target_ok',
      label: 'Target OK',
      render: (value) => value.toLocaleString('it-IT'),
    },
    {
      key: 'target_attention',
      label: 'Target Attenzione',
      render: (value) => value.toLocaleString('it-IT'),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <ContextMenuWrapper
          onEdit={() => openDialog(row)}
          onDelete={() => deleteMutation.mutate(row.id)}
        >
          <div className="w-full h-full" />
        </ContextMenuWrapper>
      ),
    },
  ];

  if (user && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Shield className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Accesso Negato</h2>
        <p className="text-slate-500">Solo gli amministratori possono gestire gli obiettivi KPI</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Gestione Obiettivi KPI" 
        description="Definisci obiettivi dinamici per periodi specifici"
      >
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Obiettivo
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={targets}
        isLoading={isLoading}
        emptyMessage="Nessun obiettivo configurato"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {editingTarget ? 'Modifica Obiettivo' : 'Nuovo Obiettivo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="kpi_id">KPI *</Label>
                <Select
                  value={formData.kpi_id}
                  onValueChange={(value) => setFormData({ ...formData, kpi_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona KPI" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KPI_DEFINITIONS).map(([id, kpi]) => (
                      <SelectItem key={id} value={id}>{kpi.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period_type">Tipo Periodo *</Label>
                  <Select
                    value={formData.period_type}
                    onValueChange={(value) => setFormData({ ...formData, period_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensile</SelectItem>
                      <SelectItem value="quarterly">Trimestrale</SelectItem>
                      <SelectItem value="annual">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Anno *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {formData.period_type === 'quarterly' && (
                <div className="space-y-2">
                  <Label htmlFor="quarter">Trimestre *</Label>
                  <Select
                    value={formData.quarter.toString()}
                    onValueChange={(value) => setFormData({ ...formData, quarter: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Gen-Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Apr-Giu)</SelectItem>
                      <SelectItem value="3">Q3 (Lug-Set)</SelectItem>
                      <SelectItem value="4">Q4 (Ott-Dic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.period_type === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="month">Mese *</Label>
                  <Select
                    value={formData.month.toString()}
                    onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2000, m - 1).toLocaleDateString('it-IT', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_ok">Target OK *</Label>
                  <Input
                    id="target_ok"
                    type="number"
                    step="0.01"
                    value={formData.target_ok}
                    onChange={(e) => setFormData({ ...formData, target_ok: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_attention">Target Attenzione *</Label>
                  <Input
                    id="target_attention"
                    type="number"
                    step="0.01"
                    value={formData.target_attention}
                    onChange={(e) => setFormData({ ...formData, target_attention: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note opzionali"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingTarget ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}