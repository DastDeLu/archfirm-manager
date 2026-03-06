import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const COLOR_PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7',
];

function TagColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#1e293b' : 'transparent',
          }}
        >
          {value === color && <Check className="h-3 w-3 text-white" />}
        </button>
      ))}
    </div>
  );
}

function TagColumn({ type, label, tags, allTagsOfType }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [usageCount, setUsageCount] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomTag.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTags'] });
      setNewName('');
      setNewColor(COLOR_PALETTE[0]);
      toast.success('Tag creato con successo');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomTag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTags'] });
      setEditingTag(null);
      toast.success('Tag aggiornato');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomTag.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTags'] });
      setDeleteTarget(null);
      setUsageCount(null);
      toast.success('Tag eliminato');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const duplicate = allTagsOfType.some(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      toast.error('Tag già presente');
      return;
    }
    createMutation.mutate({ type, name: trimmed, color: newColor });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) return;
    const duplicate = allTagsOfType.some(t => t.id !== editingTag.id && t.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      toast.error('Tag già presente');
      return;
    }
    updateMutation.mutate({ id: editingTag.id, data: { name: trimmed, color: editColor } });
  };

  const handleDeleteClick = async (tag) => {
    setDeleteTarget(tag);
    // Count usage
    try {
      let count = 0;
      if (type === 'expense') {
        const items = await base44.entities.Expense.filter({ tag: tag.name });
        count = items.length;
      } else {
        const items = await base44.entities.Revenue.filter({ tag: tag.name });
        count = items.length;
      }
      setUsageCount(count);
    } catch {
      setUsageCount(null);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{label}</h3>

      {/* Add form */}
      <form onSubmit={handleCreate} className="mb-4 space-y-2 p-3 bg-slate-50 rounded-lg border">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome tag..."
            className="flex-1 h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={createMutation.isPending || !newName.trim()} className="gap-1">
            <Plus className="h-3 w-3" />
            Aggiungi
          </Button>
        </div>
        <TagColorPicker value={newColor} onChange={setNewColor} />
      </form>

      {/* Tag list */}
      <div className="space-y-2">
        {tags.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">Nessun tag configurato</p>
        )}
        {tags.map(tag => (
          <div key={tag.id}>
            {editingTag?.id === tag.id ? (
              <form onSubmit={handleUpdate} className="p-3 bg-white border rounded-lg space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <TagColorPicker value={editColor} onChange={setEditColor} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                    <Check className="h-3 w-3 mr-1" /> Salva
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingTag(null)}>
                    <X className="h-3 w-3 mr-1" /> Annulla
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tag.color + '22', color: tag.color }}
                  >
                    {tag.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-slate-700"
                    onClick={() => {
                      setEditingTag(tag);
                      setEditName(tag.name);
                      setEditColor(tag.color);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-600"
                    onClick={() => handleDeleteClick(tag)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setUsageCount(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il tag «{deleteTarget?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {usageCount !== null && usageCount > 0
                ? `Attenzione: questo tag è usato in ${usageCount} transazion${usageCount === 1 ? 'e' : 'i'}. Le transazioni che lo usano mostreranno 'Altro'.`
                : usageCount === 0
                ? "Questo tag non è usato in nessuna transazione. L'eliminazione è sicura."
                : "Le transazioni che usano questo tag mostreranno 'Altro'."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TagManager() {
  const { data: allTags = [] } = useQuery({
    queryKey: ['customTags'],
    queryFn: () => base44.entities.CustomTag.list(),
  });

  const expenseTags = allTags.filter(t => t.type === 'expense');
  const revenueTags = allTags.filter(t => t.type === 'revenue');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Tag</CardTitle>
        <CardDescription>Configura le categorie personalizzate per spese e ricavi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TagColumn
            type="revenue"
            label="Tag Ricavi"
            tags={revenueTags}
            allTagsOfType={revenueTags}
          />
          <div className="hidden md:block w-px bg-slate-200 self-stretch" />
          <TagColumn
            type="expense"
            label="Tag Spese"
            tags={expenseTags}
            allTagsOfType={expenseTags}
          />
        </div>
      </CardContent>
    </Card>
  );
}