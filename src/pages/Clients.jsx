import React, { useEffect, useState, useCallback } from 'react';
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
import { Plus, MoreHorizontal, Pencil, Trash2, Building2, Mail, Phone, FolderKanban, Receipt, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useCurrentUserId } from '../hooks/useCurrentUserId';
import { withOwner } from '../lib/withOwner';

export default function Clients() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [nameError, setNameError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active'
  });

  const queryClient = useQueryClient();
  const uid = useCurrentUserId();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', uid],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(withOwner(data, uid)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, previousName }) => {
      await base44.entities.Client.update(id, data);
      // Se il nome è cambiato, aggiorna tutti i Fee associati
      if (previousName && previousName !== data.name) {
        const fees = await base44.entities.Fee.filter({ client_id: id });
        await Promise.all(fees.map(fee => base44.entities.Fee.update(fee.id, { client_name: data.name })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const openDialog = useCallback((client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || '',
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        notes: client.notes || '',
        status: client.status || 'active'
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        status: 'active'
      });
    }
    setDialogOpen(true);
  }, []);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
  };

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (!clientId || clients.length === 0) return;

    const targetClient = clients.find((client) => client.id === clientId);
    if (!targetClient) return;

    openDialog(targetClient);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('clientId');
    setSearchParams(nextParams, { replace: true });
  }, [clients, searchParams, setSearchParams, openDialog]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setNameError('');
    const duplicate = clients.find(c =>
      c.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
      (!editingClient || c.id !== editingClient.id)
    );
    if (duplicate) {
      setNameError(`Esiste già un cliente con il nome "${formData.name}". Scegli un nome diverso.`);
      return;
    }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData, previousName: editingClient.name });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-600',
    prospect: 'bg-blue-100 text-blue-700',
  };

  const columns = [
    {
      header: 'Cliente',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Building2 className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            {row.contact_person && (
              <p className="text-xs text-slate-500">{row.contact_person}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Contatto',
      cell: (row) => (
        <div className="space-y-1">
          {row.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-3 w-3" />
              {row.email}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-3 w-3" />
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Stato',
      cell: (row) => (
        <Badge className={statusColors[row.status || 'active']}>
          {row.status || 'active'}
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
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`Projects?client_id=${row.id}`)}>
                <FolderKanban className="h-4 w-4 mr-2" />
                Visualizza Progetti
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`Fees?client_id=${row.id}`)}>
                <Receipt className="h-4 w-4 mr-2" />
                Previsionale Incassi
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteMutation.mutate(row.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Clienti" description="Gestisci il database clienti">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Cliente
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={clients}
        loading={isLoading}
        emptyMessage="Nessun cliente ancora. Aggiungi il primo cliente per iniziare."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Modifica Cliente' : 'Aggiungi Nuovo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Azienda *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setNameError(''); }}
                  placeholder="Nome azienda"
                  required
                />
                {nameError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />{nameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Persona di Contatto</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Nome referente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+39 xxx xxx xxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Via, Città, Paese"
                />
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
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="inactive">Inattivo</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Annulla
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingClient ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}