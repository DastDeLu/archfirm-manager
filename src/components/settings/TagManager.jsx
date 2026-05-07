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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { withOwner } from '@/lib/withOwner';

// Colori a selezione rapida (palette attuale)
const COLOR_PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7',
];

// Palette estesa organizzata per tonalità (scala Tailwind 100→900)
const EXTENDED_PALETTE = [
  // Rosso
  { label: 'Rosso', shades: ['#fecaca','#f87171','#ef4444','#dc2626','#991b1b'] },
  // Arancio
  { label: 'Arancio', shades: ['#fed7aa','#fb923c','#f97316','#ea580c','#9a3412'] },
  // Ambra
  { label: 'Ambra', shades: ['#fde68a','#fbbf24','#f59e0b','#d97706','#92400e'] },
  // Verde lime
  { label: 'Lime', shades: ['#d9f99d','#a3e635','#84cc16','#65a30d','#3f6212'] },
  // Verde
  { label: 'Verde', shades: ['#a7f3d0','#34d399','#10b981','#059669','#065f46'] },
  // Teal
  { label: 'Teal', shades: ['#99f6e4','#2dd4bf','#14b8a6','#0d9488','#134e4a'] },
  // Ciano
  { label: 'Ciano', shades: ['#a5f3fc','#22d3ee','#06b6d4','#0891b2','#164e63'] },
  // Blu
  { label: 'Blu', shades: ['#bfdbfe','#60a5fa','#3b82f6','#2563eb','#1e3a8a'] },
  // Indaco
  { label: 'Indaco', shades: ['#c7d2fe','#818cf8','#6366f1','#4f46e5','#312e81'] },
  // Viola
  { label: 'Viola', shades: ['#ddd6fe','#a78bfa','#8b5cf6','#7c3aed','#4c1d95'] },
  // Fuchsia
  { label: 'Fuchsia', shades: ['#f5d0fe','#e879f9','#d946ef','#c026d3','#701a75'] },
  // Rosa
  { label: 'Rosa', shades: ['#fbcfe8','#f472b6','#ec4899','#db2777','#831843'] },
  // Slate
  { label: 'Neutri', shades: ['#e2e8f0','#94a3b8','#64748b','#475569','#1e293b'] },
];

// Icona color-swatch (SVG inline)
function ColorSwatchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12l10-10 10 10-10 10z" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" opacity="0.3" />
    </svg>
  );
}

function TagColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  // Determina se il valore corrente è fuori dalla palette rapida
  const isCustomColor = value && !COLOR_PALETTE.includes(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Colori a selezione rapida */}
      {COLOR_PALETTE.map(color => (
        <button
          key={color}
          type="button"
          aria-label={`Colore ${color}`}
          onClick={() => onChange(color)}
          className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#1e293b' : 'transparent',
            boxShadow: value === color ? '0 0 0 1px #1e293b' : undefined,
          }}
        >
          {value === color && <Check className="h-3 w-3 text-white drop-shadow" />}
        </button>
      ))}

      {/* Separatore */}
      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Trigger "Altri colori" */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Mostra altri colori"
            className="w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 bg-white hover:bg-slate-50"
            style={{
              borderColor: isCustomColor ? '#1e293b' : '#cbd5e1',
              backgroundColor: isCustomColor ? value : undefined,
              boxShadow: isCustomColor ? '0 0 0 1px #1e293b' : undefined,
            }}
          >
            {isCustomColor
              ? <Check className="h-3 w-3 text-white drop-shadow" />
              : (
                <svg viewBox="0 0 16 16" className="w-4 h-4 text-slate-500" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#f87171"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#60a5fa"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#34d399"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#a78bfa"/>
                </svg>
              )
            }
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start" side="bottom">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tonalità estese</p>
          <div className="space-y-1.5">
            {EXTENDED_PALETTE.map(group => (
              <div key={group.label} className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 w-10 shrink-0">{group.label}</span>
                <div className="flex gap-1">
                  {group.shades.map(shade => (
                    <button
                      key={shade}
                      type="button"
                      aria-label={`Colore ${shade}`}
                      onClick={() => { onChange(shade); setOpen(false); }}
                      className="w-5 h-5 rounded-sm transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 flex items-center justify-center"
                      style={{
                        backgroundColor: shade,
                        outline: value === shade ? '2px solid #1e293b' : undefined,
                        outlineOffset: value === shade ? '1px' : undefined,
                      }}
                    >
                      {value === shade && <Check className="h-2.5 w-2.5 text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TagColumn({ type, label, tags, allTagsOfType }) {
  const queryClient = useQueryClient();
  const uid = useCurrentUserId();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [usageCount, setUsageCount] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomTag.create(withOwner(data, uid)),
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