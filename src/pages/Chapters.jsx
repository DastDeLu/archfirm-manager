import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export default function Chapters() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  const [activeType, setActiveType] = useState('revenue');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'revenue',
    description: ''
  });

  const queryClient = useQueryClient();

  const invalidateChapters = () => {
    queryClient.invalidateQueries({ queryKey: ['chapters'] });
    queryClient.invalidateQueries({ queryKey: ['expense-chapters'] });
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingChapter(null);
    setFormData({ name: '', code: '', type: activeType, description: '' });
  };

  const { data: chapters = [], isLoading, isError } = useQuery({
    queryKey: ['chapters'],
    queryFn: async () => {
      const res = await base44.entities.Chapter.list();
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Chapter.create(data),
    onSuccess: () => {
      invalidateChapters();
      toast.success('Capitolo creato con successo');
      closeDialog();
    },
    onError: () => toast.error('Errore nella creazione del capitolo'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chapter.update(id, data),
    onSuccess: () => {
      invalidateChapters();
      toast.success('Capitolo aggiornato');
      closeDialog();
    },
    onError: () => toast.error("Errore nell'aggiornamento del capitolo"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Chapter.delete(id),
    onSuccess: () => {
      invalidateChapters();
      toast.success('Capitolo eliminato');
    },
    onError: () => toast.error("Errore nell'eliminazione del capitolo"),
  });

  const openDialog = (chapter = null) => {
    if (chapter) {
      setEditingChapter(chapter);
      setFormData({
        name: chapter.name || '',
        code: chapter.code || '',
        type: chapter.type || 'revenue',
        description: chapter.description || ''
      });
    } else {
      setEditingChapter(null);
      setFormData({ name: '', code: '', type: activeType, description: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingChapter?.id != null) {
      updateMutation.mutate({ id: editingChapter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredChapters = useMemo(
    () => (Array.isArray(chapters) ? chapters : []).filter(c => c.type === activeType),
    [chapters, activeType]
  );

  const columns = useMemo(() => [
    {
      header: 'Capitolo',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${row.type === 'revenue' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            {row.type === 'revenue' ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            {row.code && <p className="text-xs text-slate-500 font-mono">{row.code}</p>}
          </div>
        </div>
      ),
    },
    {
      header: 'Descrizione',
      cell: (row) => <span className="text-slate-600">{row.description || '-'}</span>,
    },
    {
      header: 'Tipo',
      cell: (row) => (
        <Badge className={row.type === 'revenue' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
          {row.type === 'revenue' ? 'Ricavi' : 'Costi'}
        </Badge>
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
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChapterToDelete(row)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <div>
      <PageHeader title="Capitoli" description="Gestisci le categorie di ricavi e costi">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Capitolo
        </Button>
      </PageHeader>

      <Tabs value={activeType} onValueChange={setActiveType} className="mb-4">
        <TabsList>
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Capitoli Ricavi
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Capitoli Costi
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          Errore nel caricamento dei capitoli. Riprova più tardi.
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredChapters}
        loading={isLoading}
        emptyMessage={`Nessun capitolo ${activeType === 'revenue' ? 'ricavi' : 'costi'} ancora. Clicca 'Aggiungi Capitolo' per crearne uno.`}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? 'Modifica Capitolo' : 'Aggiungi Nuovo Capitolo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome capitolo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Codice</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="CH001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Ricavi</SelectItem>
                    <SelectItem value="expense">Costi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione del capitolo..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingChapter ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!chapterToDelete} onOpenChange={(open) => !open && setChapterToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminare capitolo?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Vuoi eliminare "<strong>{chapterToDelete?.name}</strong>"? Questa azione non può essere annullata.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterToDelete(null)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (chapterToDelete?.id) deleteMutation.mutate(chapterToDelete.id);
                setChapterToDelete(null);
              }}
              disabled={deleteMutation.isPending}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}