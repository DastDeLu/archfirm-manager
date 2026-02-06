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
import { Plus, MoreHorizontal, Pencil, Trash2, FileText, TrendingUp, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ContextMenuWrapper from '../components/ui/ContextMenuWrapper';
import QuickAddClient from '../components/forms/QuickAddClient';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  negotiation: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
};

export default function Quotes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickAddClientOpen, setQuickAddClientOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    project_name: '',
    description: '',
    amount: '',
    status: 'draft',
    sent_date: '',
    valid_until: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const openDialog = (quote = null) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData({
        client_id: quote.client_id || '',
        client_name: quote.client_name || '',
        project_name: quote.project_name || '',
        description: quote.description || '',
        amount: quote.amount || '',
        status: quote.status || 'draft',
        sent_date: quote.sent_date || '',
        valid_until: quote.valid_until || '',
        notes: quote.notes || ''
      });
    } else {
      setEditingQuote(null);
      setFormData({
        client_id: '',
        client_name: '',
        project_name: '',
        description: '',
        amount: '',
        status: 'draft',
        sent_date: '',
        valid_until: '',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingQuote(null);
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
      amount: parseFloat(formData.amount)
    };
    if (editingQuote) {
      updateMutation.mutate({ id: editingQuote.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    if (activeFilter === 'all') return quotes;
    return quotes.filter(q => q.status === activeFilter);
  }, [quotes, activeFilter]);

  // Conversion rate stats
  const stats = useMemo(() => {
    const total = quotes.length;
    const won = quotes.filter(q => q.status === 'won').length;
    const lost = quotes.filter(q => q.status === 'lost').length;
    const active = quotes.filter(q => ['sent', 'negotiation'].includes(q.status)).length;
    
    const wonValue = quotes.filter(q => q.status === 'won').reduce((sum, q) => sum + (q.amount || 0), 0);
    const totalValue = quotes.reduce((sum, q) => sum + (q.amount || 0), 0);
    const activeValue = quotes.filter(q => ['sent', 'negotiation'].includes(q.status)).reduce((sum, q) => sum + (q.amount || 0), 0);

    const conversionRate = (won + lost) > 0 ? ((won / (won + lost)) * 100).toFixed(1) : 0;

    return { total, won, lost, active, wonValue, totalValue, activeValue, conversionRate };
  }, [quotes]);

  const columns = [
    {
      header: 'Preventivo',
      cell: (row) => (
        <ContextMenuWrapper
          onEdit={() => openDialog(row)}
          onDelete={() => deleteMutation.mutate(row.id)}
        >
          <div className="flex items-center gap-3 cursor-context-menu">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{row.project_name}</p>
              <p className="text-xs text-slate-500">{row.client_name || 'Nessun cliente'}</p>
            </div>
          </div>
        </ContextMenuWrapper>
      ),
    },
    {
      header: 'Importo',
      cell: (row) => (
        <span className="font-medium text-slate-900">
          €{(row.amount || 0).toLocaleString('it-IT')}
        </span>
      ),
    },
    {
      header: 'Stato',
      cell: (row) => (
        <Badge className={statusColors[row.status || 'draft']}>
          {row.status || 'draft'}
        </Badge>
      ),
    },
    {
      header: 'Data Invio',
      cell: (row) => (
        <span className="text-sm text-slate-600">
          {row.sent_date ? format(parseISO(row.sent_date), 'd MMM yyyy') : '-'}
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
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteMutation.mutate(row.id)} className="text-red-600">
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
      <PageHeader title="Preventivi" description="Gestisci la pipeline di vendita">
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Preventivo
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              Tasso Conversione
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.conversionRate}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.won} vinti / {stats.won + stats.lost} chiusi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Pipeline Attiva</p>
            <p className="text-2xl font-bold text-blue-600">€{stats.activeValue.toLocaleString('it-IT')}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.active} preventivi attivi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Vinti</p>
            <p className="text-2xl font-bold text-emerald-600">€{stats.wonValue.toLocaleString('it-IT')}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.won} preventivi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500">Valore Totale</p>
            <p className="text-2xl font-bold text-slate-900">€{stats.totalValue.toLocaleString('it-IT')}</p>
            <p className="text-xs text-slate-500 mt-1">{stats.total} preventivi totali</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Tutti</TabsTrigger>
          <TabsTrigger value="draft">Bozza</TabsTrigger>
          <TabsTrigger value="sent">Inviati</TabsTrigger>
          <TabsTrigger value="negotiation">In Trattativa</TabsTrigger>
          <TabsTrigger value="won">Vinti</TabsTrigger>
          <TabsTrigger value="lost">Persi</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredQuotes}
        loading={isLoading}
        emptyMessage="Nessun preventivo trovato"
      />

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingQuote ? 'Modifica Preventivo' : 'Nuovo Preventivo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <div className="flex gap-2">
                  <Select value={formData.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleziona cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuickAddClientOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_name">Nome Progetto *</Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Importo (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sent_date">Data Invio</Label>
                  <Input
                    id="sent_date"
                    type="date"
                    value={formData.sent_date}
                    onChange={(e) => setFormData({ ...formData, sent_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valido Fino</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Stato</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Bozza</SelectItem>
                    <SelectItem value="sent">Inviato</SelectItem>
                    <SelectItem value="negotiation">In Trattativa</SelectItem>
                    <SelectItem value="won">Vinto</SelectItem>
                    <SelectItem value="lost">Perso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Annulla</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingQuote ? 'Aggiorna' : 'Crea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickAddClient
        open={quickAddClientOpen}
        onOpenChange={setQuickAddClientOpen}
        onClientCreated={(client) => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          setFormData({ ...formData, client_id: client.id, client_name: client.name });
        }}
      />
    </div>
  );
}