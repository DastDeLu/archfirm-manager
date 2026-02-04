import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Plus, MoreHorizontal, Pencil, Trash2, FolderKanban, Calendar, Euro, GitBranch, FileText } from 'lucide-react';
import { format } from 'date-fns';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import ProjectDocuments from '../components/project/ProjectDocuments';

export default function Projects() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    client_name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'planning',
    priority: 'medium'
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const openDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name || '',
        client_id: project.client_id || '',
        client_name: project.client_name || '',
        description: project.description || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium'
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        client_id: '',
        client_name: '',
        description: '',
        start_date: '',
        end_date: '',
        budget: '',
        status: 'planning',
        priority: 'medium'
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProject(null);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData({ 
      ...formData, 
      client_id: clientId,
      client_name: client?.name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    };
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusColors = {
    planning: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  };

  const columns = [
    {
      header: 'Project',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <FolderKanban className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.client_name || 'No client'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Timeline',
      cell: (row) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-3 w-3" />
          {row.start_date ? format(new Date(row.start_date), 'MMM d') : 'TBD'}
          {' → '}
          {row.end_date ? format(new Date(row.end_date), 'MMM d, yyyy') : 'TBD'}
        </div>
      ),
    },
    {
      header: 'Budget',
      cell: (row) => (
        <div className="flex items-center gap-1 font-medium text-slate-900">
          <Euro className="h-3 w-3" />
          {row.budget ? row.budget.toLocaleString('it-IT') : '-'}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge className={statusColors[row.status || 'planning']}>
          {(row.status || 'planning').replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Priority',
      cell: (row) => (
        <Badge variant="outline" className={priorityColors[row.priority || 'medium']}>
          {row.priority || 'medium'}
        </Badge>
      ),
    },
    {
      header: '',
      headerClassName: 'w-12',
      cell: (row) => (
        <ContextMenuWrapper
          onEdit={() => openDialog(row)}
          onDelete={() => deleteMutation.mutate(row.id)}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`WBS?projectId=${row.id}`)}>
                <GitBranch className="h-4 w-4 mr-2" />
                View WBS
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog(row)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedProject(row);
              setDocumentsDialogOpen(true);
            }}>
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteMutation.mutate(row.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </ContextMenuWrapper>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Projects" description="Manage your architecture projects">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={projects}
        loading={isLoading}
        emptyMessage="No projects yet. Create your first project to get started."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Project name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (EUR)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingProject ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents - {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedProject && <ProjectDocuments projectId={selectedProject.id} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}