import React, { useState } from 'react';
import { useBudget } from '../components/budget/BudgetContext';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Edit, TrendingDown, TrendingUp, AlertCircle, Receipt, MoreVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CapitoliSpesa() {
  const { 
    categorie, 
    vociPerCategoria, 
    statistichePerCategoria, 
    aggiornaBudgetTotale,
    loading 
  } = useBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [spesaDialogOpen, setSpesaDialogOpen] = useState(false);
  const [editingVoce, setEditingVoce] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedVoce, setSelectedVoce] = useState(null);
  const [nomeError, setNomeError] = useState('');
  const [categoriaError, setCategoriaError] = useState('');
  const [formData, setFormData] = useState({
    id_categoria: '',
    nome: '',
    budget_totale: '',
    stato: 'attivo'
  });
  const [spesaForm, setSpesaForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    tag: 'Other',
    stato: 'Pagato'
  });
  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    descrizione: '',
    ordine: ''
  });

  const queryClient = useQueryClient();

  const createVoceMutation = useMutation({
    mutationFn: (data) => base44.entities.VoceSpesa.create({
      ...data,
      speso_reale: 0,
      residuo: data.budget_totale,
      data_aggiornamento: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      setDialogOpen(false);
      setFormData({ id_categoria: '', nome: '', budget_totale: '', stato: 'attivo' });
    },
  });

  const updateVoceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VoceSpesa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      setDialogOpen(false);
      setEditingVoce(null);
    },
  });

  const createCategoriaMutation = useMutation({
    mutationFn: (data) => base44.entities.CategoriaSpesa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorieSpesa'] });
      setCategoriaDialogOpen(false);
      setCategoriaForm({ nome: '', descrizione: '', ordine: '' });
    },
  });

  const createSpesaMutation = useMutation({
    mutationFn: async (data) => {
      const spesa = await base44.entities.Expense.create(data);
      
      // Aggiorna il budget se la spesa è pagata
      if (spesa.stato === 'Pagato' && spesa.id_voce_spesa) {
        // Chiama il service direttamente con i dati corretti
        const vociSpesa = await base44.entities.VoceSpesa.filter({ id: spesa.id_voce_spesa });
        const voceSpesa = vociSpesa[0];
        
        if (voceSpesa) {
          const nuovoSpesoReale = (voceSpesa.speso_reale || 0) + spesa.amount;
          const nuovoResiduo = voceSpesa.budget_totale - nuovoSpesoReale;
          
          await base44.entities.VoceSpesa.update(spesa.id_voce_spesa, {
            speso_reale: nuovoSpesoReale,
            residuo: nuovoResiduo,
            data_aggiornamento: new Date().toISOString()
          });
        }
      }
      
      return spesa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      setSpesaDialogOpen(false);
      setSelectedVoce(null);
      setSpesaForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        tag: 'Other',
        stato: 'Pagato'
      });
      toast.success('Spesa registrata con successo');
    },
  });

  const toggleStatoMutation = useMutation({
    mutationFn: ({ id, nuovoStato }) => base44.entities.VoceSpesa.update(id, { stato: nuovoStato }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      toast.success('Stato aggiornato');
    },
  });

  const deleteVoceMutation = useMutation({
    mutationFn: (id) => base44.entities.VoceSpesa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vociSpesa'] });
      toast.success('Voce eliminata');
    },
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CategoriaSpesa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorieSpesa'] });
      setCategoriaDialogOpen(false);
      setEditingCategoria(null);
      setCategoriaForm({ nome: '', descrizione: '', ordine: '' });
    },
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoriaSpesa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorieSpesa'] });
      toast.success('Categoria eliminata');
    },
  });

  const { vociSpesa: allVoci } = useBudget();

  const handleSubmit = (e) => {
    e.preventDefault();
    setNomeError('');
    // Controllo duplicati nome voce
    const duplicate = allVoci.find(v => 
      v.nome.trim().toLowerCase() === formData.nome.trim().toLowerCase() && 
      (!editingVoce || v.id !== editingVoce.id)
    );
    if (duplicate) {
      setNomeError(`Esiste già una voce con il nome "${formData.nome}". Scegli un nome diverso.`);
      return;
    }
    const data = {
      ...formData,
      budget_totale: parseFloat(formData.budget_totale)
    };
    if (editingVoce) {
      updateVoceMutation.mutate({ id: editingVoce.id, data });
    } else {
      createVoceMutation.mutate(data);
    }
  };

  const handleCategoriaSubmit = (e) => {
    e.preventDefault();
    setCategoriaError('');
    // Controllo duplicati nome categoria
    const duplicate = categorie.find(c => 
      c.nome.trim().toLowerCase() === categoriaForm.nome.trim().toLowerCase() &&
      (!editingCategoria || c.id !== editingCategoria.id)
    );
    if (duplicate) {
      setCategoriaError(`Esiste già una categoria con il nome "${categoriaForm.nome}". Scegli un nome diverso.`);
      return;
    }
    const payload = { ...categoriaForm, ordine: categoriaForm.ordine ? parseInt(categoriaForm.ordine) : 0 };
    if (editingCategoria) {
      updateCategoriaMutation.mutate({ id: editingCategoria.id, data: payload });
    } else {
      createCategoriaMutation.mutate(payload);
    }
  };

  const handleBudgetEdit = async (voce) => {
    if (editingBudget === voce.id) {
      // Salva
      const nuovoBudget = parseFloat(document.getElementById(`budget-${voce.id}`).value);
      if (!isNaN(nuovoBudget)) {
        await aggiornaBudgetTotale(voce.id, nuovoBudget);
      }
      setEditingBudget(null);
    } else {
      // Apri edit
      setEditingBudget(voce.id);
    }
  };

  const handleEditVoce = (voce) => {
    setEditingVoce(voce);
    setFormData({
      id_categoria: voce.id_categoria,
      nome: voce.nome,
      budget_totale: voce.budget_totale,
      stato: voce.stato
    });
    setDialogOpen(true);
  };

  const handleToggleStato = (voce) => {
    const nuovoStato = voce.stato === 'attivo' ? 'chiuso' : 'attivo';
    toggleStatoMutation.mutate({ id: voce.id, nuovoStato });
  };

  const handleDeleteVoce = (voce) => {
    if (window.confirm(`Eliminare la voce "${voce.nome}"? L'operazione non è reversibile.`)) {
      deleteVoceMutation.mutate(voce.id);
    }
  };

  const handleEditCategoria = (categoria) => {
    setEditingCategoria(categoria);
    setCategoriaForm({ nome: categoria.nome, descrizione: categoria.descrizione || '', ordine: categoria.ordine || '' });
    setCategoriaDialogOpen(true);
  };

  const handleDeleteCategoria = (categoria) => {
    if (window.confirm(`Eliminare la categoria "${categoria.nome}" e tutte le sue voci? L'operazione non è reversibile.`)) {
      deleteCategoriaMutation.mutate(categoria.id);
    }
  };

  const handleAddSpesa = (voce) => {
    setSelectedVoce(voce);
    setSpesaDialogOpen(true);
  };

  const handleSpesaSubmit = (e) => {
    e.preventDefault();
    const cat = categorie.find(c => c.id === selectedVoce.id_categoria);
    createSpesaMutation.mutate({
      ...spesaForm,
      amount: parseFloat(spesaForm.amount),
      id_voce_spesa: selectedVoce.id,
      chapter_id: cat?.id || selectedVoce.id_categoria,
      chapter_name: cat?.nome || '',
      payment_method: 'bank_transfer',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Capitoli di Spesa" 
        description="Gestisci budget e monitoraggio spese per categoria"
      >
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCategoriaDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuova Categoria
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuova Voce
          </Button>
        </div>
      </PageHeader>

      {/* Categorie e Tabelle */}
      <div className="space-y-6">
        {categorie.map(categoria => {
          const voci = vociPerCategoria[categoria.id] || [];
          const stats = statistichePerCategoria[categoria.id];

          return (
            <Card key={categoria.id}>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold">{categoria.nome}</CardTitle>
                      {categoria.descrizione && (
                        <p className="text-sm text-slate-500 mt-1">{categoria.descrizione}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleEditCategoria(categoria)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica Categoria
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCategoria(categoria)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina Categoria
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Budget Totale Categoria</p>
                    <p className="text-xl font-bold text-slate-900">
                      €{stats?.budgetTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Speso: €{stats?.spesoTotale.toLocaleString('it-IT')} • 
                      Residuo: <span className={cn(
                        "font-medium",
                        stats?.residuoTotale < 0 ? "text-red-600" : "text-emerald-600"
                      )}>
                        €{stats?.residuoTotale.toLocaleString('it-IT')}
                      </span>
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {voci.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Nessuna voce di spesa in questa categoria
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Voce</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Previsione</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Baseline/Rimanente</th>
                          <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Speso Reale</th>
                          <th className="px-4 py-3 text-sm font-medium text-slate-600">Progresso</th>
                          <th className="px-4 py-3 text-sm font-medium text-slate-600">Stato</th>
                          <th className="px-4 py-3 text-sm font-medium text-slate-600">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voci.map(voce => {
                          const percentuale = voce.budget_totale > 0 
                            ? (voce.speso_reale / voce.budget_totale) * 100 
                            : 0;
                          const isOverbudget = voce.residuo < 0;

                          return (
                            <tr key={voce.id} className="border-b hover:bg-slate-50/50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">{voce.nome}</span>
                                  {isOverbudget && (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right">
                                {editingBudget === voce.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Input
                                      id={`budget-${voce.id}`}
                                      type="number"
                                      defaultValue={voce.budget_totale}
                                      step="0.01"
                                      className="w-32 text-right"
                                      autoFocus
                                    />
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleBudgetEdit(voce)}
                                    >
                                      Salva
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleBudgetEdit(voce)}
                                    className="font-medium text-slate-900 hover:text-blue-600 flex items-center gap-1 ml-auto"
                                  >
                                    €{voce.budget_totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                    <Edit className="h-3 w-3" />
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className={cn(
                                  "font-semibold",
                                  isOverbudget ? "text-red-600" : "text-emerald-600"
                                )}>
                                  €{voce.residuo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <span className="font-medium text-slate-900">
                                  €{voce.speso_reale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={Math.min(percentuale, 100)} 
                                    className={cn(
                                      "h-2",
                                      isOverbudget && "[&>div]:bg-red-500"
                                    )}
                                  />
                                  <span className={cn(
                                    "text-xs font-medium whitespace-nowrap",
                                    isOverbudget ? "text-red-600" : "text-slate-600"
                                  )}>
                                    {percentuale.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge className={
                                  voce.stato === 'chiuso' 
                                    ? 'bg-slate-100 text-slate-700' 
                                    : 'bg-emerald-100 text-emerald-700'
                                }>
                                  {voce.stato}
                                </Badge>
                              </td>
                              <td className="px-4 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditVoce(voce)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Modifica Voce
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleStato(voce)}>
                                      {voce.stato === 'attivo' ? 'Chiudi Voce' : 'Riapri Voce'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteVoce(voce)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Elimina Voce
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {categorie.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-500 mb-4">Nessuna categoria di spesa creata</p>
              <Button onClick={() => setCategoriaDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Prima Categoria
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Nuova/Modifica Voce */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingVoce(null);
          setFormData({ id_categoria: '', nome: '', budget_totale: '', stato: 'attivo' });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVoce ? 'Modifica Voce' : 'Nuova Voce di Spesa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.id_categoria}
                  onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
                  required
                >
                  <option value="">Seleziona categoria</option>
                  {categorie.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nome Voce *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => { setFormData({ ...formData, nome: e.target.value }); setNomeError(''); }}
                  placeholder="es. Internet studio"
                  required
                />
                {nomeError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />{nomeError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Budget Totale (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.budget_totale}
                  onChange={(e) => setFormData({ ...formData, budget_totale: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Stato *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.stato}
                  onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                  required
                >
                  <option value="attivo">Attivo</option>
                  <option value="chiuso">Chiuso</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit">
                {editingVoce ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi Spesa */}
      <Dialog open={spesaDialogOpen} onOpenChange={(open) => {
        setSpesaDialogOpen(open);
        if (!open) {
          setSelectedVoce(null);
          setSpesaForm({
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: '',
            tag: 'Other',
            stato: 'Pagato'
          });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova Spesa per {selectedVoce?.nome}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSpesaSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Importo (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={spesaForm.amount}
                  onChange={(e) => setSpesaForm({ ...spesaForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={spesaForm.date}
                  onChange={(e) => setSpesaForm({ ...spesaForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  value={spesaForm.description}
                  onChange={(e) => setSpesaForm({ ...spesaForm, description: e.target.value })}
                  placeholder="Descrizione spesa"
                />
              </div>
              <div className="space-y-2">
                <Label>Tag *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={spesaForm.tag}
                  onChange={(e) => setSpesaForm({ ...spesaForm, tag: e.target.value })}
                  required
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Collab">Collab</option>
                  <option value="Salary">Salary</option>
                  <option value="Var">Var</option>
                  <option value="Tax">Tax</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Stato *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={spesaForm.stato}
                  onChange={(e) => setSpesaForm({ ...spesaForm, stato: e.target.value })}
                  required
                >
                  <option value="Pagato">Pagato</option>
                  <option value="In attesa">In attesa</option>
                  <option value="Annullato">Annullato</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSpesaDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit">Registra Spesa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuova/Modifica Categoria */}
      <Dialog open={categoriaDialogOpen} onOpenChange={(open) => {
        setCategoriaDialogOpen(open);
        if (!open) { setEditingCategoria(null); setCategoriaForm({ nome: '', descrizione: '', ordine: '' }); setCategoriaError(''); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategoria ? 'Modifica Categoria' : 'Nuova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategoriaSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome Categoria *</Label>
                <Input
                  value={categoriaForm.nome}
                  onChange={(e) => { setCategoriaForm({ ...categoriaForm, nome: e.target.value }); setCategoriaError(''); }}
                  placeholder="es. Costi produttivi"
                  required
                />
                {categoriaError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />{categoriaError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  value={categoriaForm.descrizione}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, descrizione: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordine</Label>
                <Input
                  type="number"
                  value={categoriaForm.ordine}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, ordine: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoriaDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit">{editingCategoria ? 'Aggiorna' : 'Crea'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}