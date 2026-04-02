import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { withOwner } from '@/lib/withOwner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function QuickAddChapter({ open, onOpenChange, onChapterCreated }) {
  const uid = useCurrentUserId();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'expense',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Chapter.create(withOwner(data, uid)),
    onSuccess: (created) => {
      toast.success('Capitolo creato');
      if (onChapterCreated) onChapterCreated(created);
      onOpenChange(false);
      setFormData({ name: '', code: '', description: '', type: 'expense' });
    },
    onError: () => {
      toast.error('Errore nella creazione del capitolo');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Aggiungi Capitolo di Spesa
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Capitolo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es. Utenze, Affitti..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Codice</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Es. CAP-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione opzionale"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creazione...' : 'Crea Capitolo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}