import React, { useState, useEffect, useMemo } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, ChevronRight, ChevronDown, Layers, Clock, Euro, FolderKanban, User, Users } from 'lucide-react';
import { formatCurrency } from '../components/lib/formatters';
import { cn } from '@/lib/utils';
import QuickAddEmployee from '../components/forms/QuickAddEmployee';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function WBSItem({ item, children, level, onEdit, onDelete, onAddChild, computedCosts }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children && children.length > 0;
  // Usa costi calcolati se disponibili (padre con figli)
  const displayEstHours = computedCosts?.[item.id]?.estimated_hours ?? item.estimated_hours ?? 0;
  const displayActHours = computedCosts?.[item.id]?.actual_hours ?? item.actual_hours ?? 0;
  const displayEstCost = computedCosts?.[item.id]?.estimated_cost ?? item.estimated_cost ?? 0;
  const displayActCost = computedCosts?.[item.id]?.actual_cost ?? item.actual_cost ?? 0;

  const typeColors = {
    phase: 'bg-purple-100 text-purple-700 border-purple-200',
    subphase: 'bg-blue-100 text-blue-700 border-blue-200',
    task: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusColors = {
    not_started: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  const hoursDiff = displayActHours - displayEstHours;
  const costDiff = displayActCost - displayEstCost;

  return (
    <div className={cn("", level > 1 && "ml-6")}>
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border mb-2 transition-colors",
        typeColors[item.type || 'task']
      )}>
        <button 
          onClick={() => setExpanded(!expanded)}
          className={cn("p-1 rounded hover:bg-white/50", !hasChildren && "invisible")}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{item.code}</span>
            <span className="font-medium text-slate-900">{item.name}</span>
            <Badge variant="outline" className={statusColors[item.status || 'not_started']}>
              {(item.status || 'not_started').replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Stim: {displayEstHours}h</span>
              <span className={cn(
              "font-medium",
              hoursDiff > 0 ? "text-red-600" : hoursDiff < 0 ? "text-emerald-600" : ""
              )}>
              (Eff: {displayActHours}h)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Euro className="h-3 w-3" />
              <span>Stim: {formatCurrency(displayEstCost)}</span>
              <span className={cn(
                "font-medium",
                costDiff > 0 ? "text-red-600" : costDiff < 0 ? "text-emerald-600" : ""
              )}>
                (Eff: {formatCurrency(displayActCost)})
              </span>
            </div>
            {item.assigned_to_name && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{item.assigned_to_name}</span>
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddChild(item)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Figlio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(item.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && hasChildren && (
        <div className="border-l-2 border-slate-200 ml-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function WBS() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [parentItem, setParentItem] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'task',
    estimated_hours: '',
    actual_hours: '',
    estimated_cost: '',
    actual_cost: '',
    status: 'not_started',
    assigned_to_id: '',
    assigned_to_name: '',
    assignees: [],
    order_index: 0
  });
  const [quickAddEmployeeOpen, setQuickAddEmployeeOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: allWbsItems = [], isLoading } = useQuery({
    queryKey: ['wbs'],
    queryFn: () => base44.entities.WBS.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Group WBS items by project
  const wbsByProject = useMemo(() => {
    const grouped = {};
    allWbsItems.forEach(item => {
      if (!grouped[item.project_id]) {
        grouped[item.project_id] = [];
      }
      grouped[item.project_id].push(item);
    });
    return grouped;
  }, [allWbsItems]);

  // Calcola costi somma figli per ogni nodo padre
  const computedCosts = useMemo(() => {
    const result = {};
    // Per ogni item, se ha figli, il costo stimato/effettivo = somma figli
    allWbsItems.forEach(item => {
      const children = allWbsItems.filter(i => i.parent_id === item.id);
      if (children.length > 0) {
        result[item.id] = {
          estimated_cost: children.reduce((s, c) => s + (c.estimated_cost || 0), 0),
          actual_cost: children.reduce((s, c) => s + (c.actual_cost || 0), 0),
          estimated_hours: children.reduce((s, c) => s + (c.estimated_hours || 0), 0),
          actual_hours: children.reduce((s, c) => s + (c.actual_hours || 0), 0),
        };
      }
    });
    return result;
  }, [allWbsItems]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WBS.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WBS.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WBS.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });

  const openDialog = (item = null, parent = null) => {
    setParentItem(parent);
    if (item) {
      setEditingItem(item);
      // Migrate legacy single assignee to assignees array
      let assignees = item.assignees || [];
      if (assignees.length === 0 && item.assigned_to_id) {
        assignees = [{ id: item.assigned_to_id, name: item.assigned_to_name || '' }];
      }
      setFormData({
        name: item.name || '',
        code: item.code || '',
        type: item.type || 'task',
        estimated_hours: item.estimated_hours || '',
        actual_hours: item.actual_hours || '',
        estimated_cost: item.estimated_cost || '',
        actual_cost: item.actual_cost || '',
        status: item.status || 'not_started',
        assigned_to_id: item.assigned_to_id || '',
        assigned_to_name: item.assigned_to_name || '',
        assignees,
        order_index: item.order_index || 0
      });
    } else {
      setEditingItem(null);
      const nextType = parent 
        ? (parent.type === 'phase' ? 'subphase' : 'task')
        : 'phase';
      setFormData({
        name: '',
        code: '',
        type: nextType,
        estimated_hours: '',
        actual_hours: '',
        estimated_cost: '',
        actual_cost: '',
        status: 'not_started',
        assigned_to_id: '',
        assigned_to_name: '',
        assignees: [],
        order_index: 0
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setParentItem(null);
  };

  // Check if the item being edited/created has children (for read-only cost fields)
  const hasChildren = editingItem 
    ? allWbsItems.some(i => i.parent_id === editingItem.id)
    : false;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    const level = parentItem ? (parentItem.level || 1) + 1 : 1;
    // Per padri con figli, usa i costi calcolati dai figli
    const computed = editingItem ? computedCosts[editingItem.id] : null;
    // Sync legacy fields from assignees array (first assignee = primary)
    const primaryAssignee = formData.assignees?.[0] || null;
    const data = {
      ...formData,
      project_id: selectedProjectId,
      parent_id: parentItem?.id || null,
      level,
      assigned_to_id: primaryAssignee?.id || '',
      assigned_to_name: primaryAssignee?.name || '',
      estimated_hours: computed ? computed.estimated_hours : (formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0),
      actual_hours: computed ? computed.actual_hours : (formData.actual_hours ? parseFloat(formData.actual_hours) : 0),
      estimated_cost: computed ? computed.estimated_cost : (formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0),
      actual_cost: computed ? computed.actual_cost : (formData.actual_cost ? parseFloat(formData.actual_cost) : 0),
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Build tree structure for specific project
  const buildTreeForProject = (items) => {
    const map = {};
    const roots = [];

    items.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    items.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  };

  const renderTree = (items, level = 1) => {
    return items.map(item => (
      <WBSItem
        key={item.id}
        item={item}
        level={level}
        onEdit={openDialog}
        onDelete={(id) => deleteMutation.mutate(id)}
        onAddChild={(parent) => openDialog(null, parent)}
        computedCosts={computedCosts}
      >
        {item.children && item.children.length > 0 && renderTree(item.children, level + 1)}
      </WBSItem>
    ));
  };

  // Calculate project statistics
  const getProjectStats = (projectId) => {
    const items = wbsByProject[projectId] || [];
    const uniqueAssignees = new Set(items.map(item => item.assigned_to_id).filter(Boolean));
    
    return {
      totalEstimatedHours: items.reduce((sum, item) => sum + (item.estimated_hours || 0), 0),
      totalCost: items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0),
      teamSize: uniqueAssignees.size,
      assignees: Array.from(uniqueAssignees).map(id => {
        const item = items.find(i => i.assigned_to_id === id);
        return { id, name: item?.assigned_to_name || 'Unknown' };
      })
    };
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <div>
      <PageHeader 
        title="WBS - Struttura di Scomposizione del Lavoro"
        description="Gestisci fasi, sotto-fasi e attività raggruppate per progetto"
      />

      {/* Projects List with WBS */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500">Caricamento...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Nessun Progetto</h2>
            <p className="text-slate-500 mb-6">Crea un progetto per iniziare a gestire la WBS.</p>
            <Button asChild>
              <a href={createPageUrl('Projects')}>Vai ai Progetti</a>
            </Button>
          </div>
        ) : (
          projects.map(project => {
            const projectWbs = wbsByProject[project.id] || [];
            const stats = getProjectStats(project.id);
            const wbsTree = buildTreeForProject(projectWbs);
            const isExpanded = expandedProjects[project.id] ?? true;

            return (
              <Card key={project.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-500" />
                          )}
                          <FolderKanban className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <Badge variant="outline" className="ml-2">
                            {projectWbs.length} task{projectWbs.length !== 1 ? 's' : ''}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          openDialog();
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Aggiungi Task
                      </Button>
                    </div>

                    {/* Project Statistics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-blue-700 mb-1">
                          <Clock className="h-3 w-3" />
                          Ore Stimate Totali
                        </div>
                        <p className="text-xl font-bold text-blue-900">{stats.totalEstimatedHours}h</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-emerald-700 mb-1">
                          <Euro className="h-3 w-3" />
                          Costo Totale
                        </div>
                        <p className="text-xl font-bold text-emerald-900">
                          {formatCurrency(stats.totalCost)}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-purple-700 mb-1">
                          <Users className="h-3 w-3" />
                          Dimensione Team
                        </div>
                        <p className="text-xl font-bold text-purple-900">{stats.teamSize}</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-amber-700 mb-1">
                          <User className="h-3 w-3" />
                          Assegnati
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {stats.assignees.length === 0 ? (
                            <span className="text-xs text-slate-500">Nessuno</span>
                          ) : (
                            stats.assignees.slice(0, 3).map(assignee => (
                              <Badge key={assignee.id} variant="outline" className="text-xs">
                                {assignee.name}
                              </Badge>
                            ))
                          )}
                          {stats.assignees.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{stats.assignees.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent>
                      {projectWbs.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                          Nessun task ancora. Clicca "Aggiungi Task" per iniziare.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {renderTree(wbsTree)}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifica Elemento WBS' : `Aggiungi ${parentItem ? 'Sotto-elemento' : 'Fase'}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Codice</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="1.1.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phase">Fase</SelectItem>
                      <SelectItem value="subphase">Sotto-fase</SelectItem>
                      <SelectItem value="task">Attività</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome elemento"
                  required
                />
              </div>
              {hasChildren && (
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  Ore e costi calcolati automaticamente dalla somma dei figli (sola lettura).
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_hours">Ore Stimate</Label>
                  {hasChildren ? (
                    <p className="text-sm font-semibold text-slate-700 py-2">
                      {computedCosts[editingItem?.id]?.estimated_hours || 0}h
                    </p>
                  ) : (
                    <Input
                      id="estimated_hours"
                      type="number"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                      placeholder="0"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_hours">Ore Effettive</Label>
                  {hasChildren ? (
                    <p className="text-sm font-semibold text-slate-700 py-2">
                      {computedCosts[editingItem?.id]?.actual_hours || 0}h
                    </p>
                  ) : (
                    <Input
                      id="actual_hours"
                      type="number"
                      value={formData.actual_hours}
                      onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                      placeholder="0"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">Costo Stimato (€)</Label>
                  {hasChildren ? (
                    <p className="text-sm font-semibold text-slate-700 py-2">
                      {formatCurrency(computedCosts[editingItem?.id]?.estimated_cost || 0)}
                    </p>
                  ) : (
                    <Input
                      id="estimated_cost"
                      type="number"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_cost">Costo Effettivo (€)</Label>
                  {hasChildren ? (
                    <p className="text-sm font-semibold text-slate-700 py-2">
                      {formatCurrency(computedCosts[editingItem?.id]?.actual_cost || 0)}
                    </p>
                  ) : (
                    <Input
                      id="actual_cost"
                      type="number"
                      value={formData.actual_cost}
                      onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assegnato a</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.assigned_to_id}
                    onValueChange={(employeeId) => {
                      const employee = employees.find(e => e.id === employeeId);
                      setFormData({ 
                        ...formData, 
                        assigned_to_id: employeeId,
                        assigned_to_name: employee?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleziona dipendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuickAddEmployeeOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Stato</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Non Iniziato</SelectItem>
                    <SelectItem value="in_progress">In Corso</SelectItem>
                    <SelectItem value="completed">Completato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickAddEmployee
        open={quickAddEmployeeOpen}
        onOpenChange={setQuickAddEmployeeOpen}
        onEmployeeCreated={(employee) => {
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          setFormData({ ...formData, assigned_to_id: employee.id, assigned_to_name: employee.name });
        }}
      />
    </div>
  );
}