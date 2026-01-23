import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, Euro, Filter } from 'lucide-react';
import { format } from 'date-fns';

const TAGS = ['PG', 'DL', 'PV', 'BR', 'Other'];

const tagColors = {
  PG: 'bg-purple-100 text-purple-700',
  DL: 'bg-blue-100 text-blue-700',
  PV: 'bg-emerald-100 text-emerald-700',
  BR: 'bg-amber-100 text-amber-700',
  Other: 'bg-slate-100 text-slate-700',
};

export default function Revenues() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [activeTag, setActiveTag] = useState('all');
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    tag: 'PG',
    chapter_id: '',
    chapter_name: '',
    project_id: '',
    project_name: ''
  });

  const queryClient = useQueryClient();

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => base44.entities.Revenue.list('-date'),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => base44.entities.Chapter.filter({ type: 'revenue' }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Revenue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Revenue.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Revenue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
    },
  });

  const openDialog = (revenue = null) => {
    if (revenue) {
      setEditingRevenue(revenue);
      setFormData({
        amount: revenue.amount || '',
        date: revenue.date || format(new Date(), 'yyyy-MM-dd'),
        description: revenue.description || '',
        tag: revenue.tag || 'PG',
        chapter_id: revenue.chapter_id || '',
        chapter_name: revenue.chapter_name || '',
        project_id: revenue.project_id || '',
        project_name: revenue.project_name || ''
      });
    } else {
      setEditingRevenue(null);
      setFormData({
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        tag: 'PG',
        chapter_id: '',
        chapter_name: '',
        project_id: '',
        project_name: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRevenue(null);
  };

  const handleChapterChange = (chapterId) => {
    const chapter = chapters.find(c => c.id === chapterId);
    setFormData({ 
      ...formData, 
      chapter_id: chapterId,
      chapter_name: chapter?.name || ''
    });
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setFormData({ 
      ...formData, 
      project_id: projectId,
      project_name: project?.name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount)
    };
    if (editingRevenue) {
      updateMutation.mutate({ id: editingRevenue.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredRevenues = activeTag === 'all' 
    ? revenues 
    : revenues.filter(r => r.tag === activeTag);

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

  const columns = [
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-slate-600">
          {row.date ? format(new Date(row.date), 'MMM d, yyyy') : '-'}
        </span>
      ),
    },
    {
      header: 'Description',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.description || 'No description'}</p>
          {row.project_name && (
            <p className="text-xs text-slate-500">{row.project_name}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Tag',
      cell: (row) => (
        <Badge className={tagColors[row.tag || 'Other']}>
          {row.tag || 'Other'}
        </Badge>
      ),
    },
    {
      header: 'Chapter',
      cell: (row) => (
        <span className="text-slate-600">{row.chapter_name || '-'}</span>
      ),
    },
    {
      header: 'Amount',
      cell: (row) => (
        <span className="font-semibold text-emerald-600">
          +€{(row.amount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: '',
      headerClassName: 'w-12',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDialog(row)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
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
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Revenues" description="Track all income and revenue streams">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Revenue
        </Button>
      </PageHeader>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">
                {activeTag === 'all' ? 'Total Revenue' : `${activeTag} Revenue`}
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                €{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter className="h-4 w-4" />
            {filteredRevenues.length} entries
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={activeTag} onValueChange={setActiveTag} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {TAGS.map(tag => (
            <TabsTrigger key={tag} value={tag}>{tag}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredRevenues}
        loading={isLoading}
        emptyMessage="No revenues recorded yet. Click 'Add Revenue' to get started."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRevenue ? 'Edit Revenue' : 'Add New Revenue'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (EUR) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Revenue description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">Tag *</Label>
                  <Select
                    value={formData.tag}
                    onValueChange={(value) => setFormData({ ...formData, tag: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter</Label>
                  <Select
                    value={formData.chapter_id}
                    onValueChange={handleChapterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map(chapter => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRevenue ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}