import React, { useState, useEffect, useMemo } from 'react';
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
import { Plus, MoreHorizontal, Pencil, Trash2, ChevronRight, ChevronDown, Layers, Clock, Euro, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

function WBSItem({ item, children, level, onEdit, onDelete, onAddChild }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children && children.length > 0;

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

  const hoursDiff = (item.actual_hours || 0) - (item.estimated_hours || 0);
  const costDiff = (item.actual_cost || 0) - (item.estimated_cost || 0);

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
              <span>Est: {item.estimated_hours || 0}h</span>
              <span className={cn(
                "font-medium",
                hoursDiff > 0 ? "text-red-600" : hoursDiff < 0 ? "text-emerald-600" : ""
              )}>
                (Actual: {item.actual_hours || 0}h)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Euro className="h-3 w-3" />
              <span>Est: €{(item.estimated_cost || 0).toLocaleString('it-IT')}</span>
              <span className={cn(
                "font-medium",
                costDiff > 0 ? "text-red-600" : costDiff < 0 ? "text-emerald-600" : ""
              )}>
                (Actual: €{(item.actual_cost || 0).toLocaleString('it-IT')})
              </span>
            </div>
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
              Add Child
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(item.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
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
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [parentItem, setParentItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'task',
    estimated_hours: '',
    actual_hours: '',
    estimated_cost: '',
    actual_cost: '',
    status: 'not_started',
    order_index: 0
  });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: wbsItems = [], isLoading } = useQuery({
    queryKey: ['wbs', projectId],
    queryFn: () => base44.entities.WBS.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const currentProject = projects.find(p => p.id === projectId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WBS.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WBS.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WBS.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs', projectId] });
    },
  });

  const openDialog = (item = null, parent = null) => {
    setParentItem(parent);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        code: item.code || '',
        type: item.type || 'task',
        estimated_hours: item.estimated_hours || '',
        actual_hours: item.actual_hours || '',
        estimated_cost: item.estimated_cost || '',
        actual_cost: item.actual_cost || '',
        status: item.status || 'not_started',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const level = parentItem ? (parentItem.level || 1) + 1 : 1;
    const data = {
      ...formData,
      project_id: projectId,
      parent_id: parentItem?.id || null,
      level,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
      actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : 0,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : 0,
      actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : 0,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Build tree structure
  const wbsTree = useMemo(() => {
    const map = {};
    const roots = [];

    wbsItems.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    wbsItems.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  }, [wbsItems]);

  const renderTree = (items, level = 1) => {
    return items.map(item => (
      <WBSItem
        key={item.id}
        item={item}
        level={level}
        onEdit={openDialog}
        onDelete={(id) => deleteMutation.mutate(id)}
        onAddChild={(parent) => openDialog(null, parent)}
      >
        {item.children && item.children.length > 0 && renderTree(item.children, level + 1)}
      </WBSItem>
    ));
  };

  // Calculate totals
  const totals = useMemo(() => {
    return wbsItems.reduce((acc, item) => ({
      estimatedHours: acc.estimatedHours + (item.estimated_hours || 0),
      actualHours: acc.actualHours + (item.actual_hours || 0),
      estimatedCost: acc.estimatedCost + (item.estimated_cost || 0),
      actualCost: acc.actualCost + (item.actual_cost || 0),
    }), { estimatedHours: 0, actualHours: 0, estimatedCost: 0, actualCost: 0 });
  }, [wbsItems]);

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <FolderKanban className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a Project</h2>
        <p className="text-slate-500 mb-6">Please select a project from the Projects page to view its WBS.</p>
        <Button asChild>
          <a href={createPageUrl('Projects')}>Go to Projects</a>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title={`WBS: ${currentProject?.name || 'Loading...'}`}
        description="Work Breakdown Structure - Manage phases, sub-phases, and tasks"
      >
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Phase
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Clock className="h-4 w-4" />
              Estimated Hours
            </div>
            <p className="text-2xl font-bold">{totals.estimatedHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Clock className="h-4 w-4" />
              Actual Hours
            </div>
            <p className={cn(
              "text-2xl font-bold",
              totals.actualHours > totals.estimatedHours ? "text-red-600" : "text-emerald-600"
            )}>
              {totals.actualHours}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Euro className="h-4 w-4" />
              Estimated Cost
            </div>
            <p className="text-2xl font-bold">€{totals.estimatedCost.toLocaleString('it-IT')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Euro className="h-4 w-4" />
              Actual Cost
            </div>
            <p className={cn(
              "text-2xl font-bold",
              totals.actualCost > totals.estimatedCost ? "text-red-600" : "text-emerald-600"
            )}>
              €{totals.actualCost.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* WBS Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Work Breakdown Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : wbsTree.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No WBS items yet. Click "Add Phase" to create your first phase.
            </div>
          ) : (
            <div className="space-y-2">
              {renderTree(wbsTree)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit WBS Item' : `Add ${parentItem ? 'Child Item' : 'Phase'}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="1.1.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phase">Phase</SelectItem>
                      <SelectItem value="subphase">Sub-phase</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Item name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_hours">Estimated Hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_hours">Actual Hours</Label>
                  <Input
                    id="actual_hours"
                    type="number"
                    value={formData.actual_hours}
                    onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">Estimated Cost (€)</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_cost">Actual Cost (€)</Label>
                  <Input
                    id="actual_cost"
                    type="number"
                    value={formData.actual_cost}
                    onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}