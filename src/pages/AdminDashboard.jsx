import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../components/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import { Shield, Users, Receipt, TrendingUp, Search, Trash2, AlertTriangle, Clock, Database } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../components/lib/formatters';

export default function AdminDashboard() {
  const { user, isSviluppatore, loading } = useCurrentUser();
  const [searchEmail, setSearchEmail] = useState('');
  const queryClient = useQueryClient();

  // All data - no created_by filter (admin bypass)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isSviluppatore,
  });

  const { data: allRevenues = [] } = useQuery({
    queryKey: ['admin-revenues'],
    queryFn: () => base44.entities.Revenue.list('-date'),
    enabled: isSviluppatore,
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    enabled: isSviluppatore,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => base44.entities.Project.list(),
    enabled: isSviluppatore,
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => base44.entities.Client.list(),
    enabled: isSviluppatore,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
    enabled: isSviluppatore,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ id, role }) => {
      base44.functions.invoke('writeAuditLog', {
        action: 'update',
        entity_type: 'User',
        entity_id: id,
        details: { field: 'role', new_value: role }
      });
      return base44.entities.User.update(id, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSviluppatore) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold text-slate-900">Accesso Negato</h2>
        <p className="text-slate-500">Questa sezione è riservata esclusivamente agli Sviluppatori.</p>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u =>
    !searchEmail || u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const totalRevenue = allRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const clienteUsers = allUsers.filter(u => u.role === 'Cliente').length;
  const sviluppatoreUsers = allUsers.filter(u => u.role === 'Sviluppatore').length;

  const actionBadge = (action) => {
    const map = {
      create: 'bg-emerald-100 text-emerald-700',
      update: 'bg-blue-100 text-blue-700',
      delete: 'bg-red-100 text-red-700',
      export: 'bg-purple-100 text-purple-700',
      import: 'bg-amber-100 text-amber-700',
    };
    return map[action] || 'bg-slate-100 text-slate-700';
  };

  const userColumns = [
    {
      header: 'Utente',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.full_name || '—'}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Ruolo',
      cell: (row) => (
        <Badge className={row.role === 'Sviluppatore' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}>
          {row.role || 'Cliente'}
        </Badge>
      ),
    },
    {
      header: 'Registrato',
      cell: (row) => (
        <span className="text-sm text-slate-600">
          {row.created_date ? format(new Date(row.created_date), 'dd/MM/yyyy') : '—'}
        </span>
      ),
    },
    {
      header: 'Azioni',
      cell: (row) => (
        <div className="flex gap-2">
          {row.role !== 'Sviluppatore' && row.email !== user?.email && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateUserRoleMutation.mutate({ id: row.id, role: 'Sviluppatore' })}
            >
              → Sviluppatore
            </Button>
          )}
          {row.role === 'Sviluppatore' && row.email !== user?.email && (
            <Button
              size="sm"
              variant="outline"
              className="text-slate-600"
              onClick={() => updateUserRoleMutation.mutate({ id: row.id, role: 'Cliente' })}
            >
              → Cliente
            </Button>
          )}
        </div>
      ),
    },
  ];

  const auditColumns = [
    {
      header: 'Timestamp',
      cell: (row) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {row.created_date ? format(new Date(row.created_date), 'dd/MM/yy HH:mm') : '—'}
        </span>
      ),
    },
    {
      header: 'Utente',
      cell: (row) => <span className="text-sm text-slate-700">{row.user_email}</span>,
    },
    {
      header: 'Azione',
      cell: (row) => (
        <Badge className={actionBadge(row.action)}>{row.action}</Badge>
      ),
    },
    {
      header: 'Entità',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.entity_type}</p>
          <p className="text-xs text-slate-500">{row.entity_id}</p>
        </div>
      ),
    },
    {
      header: 'Dettagli',
      cell: (row) => (
        <span className="text-xs text-slate-500 max-w-xs truncate block">
          {row.details || '—'}
        </span>
      ),
    },
  ];

  const revenueColumns = [
    {
      header: 'Data',
      cell: (row) => <span className="text-sm">{row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '—'}</span>,
    },
    {
      header: 'Creato da',
      cell: (row) => <span className="text-xs text-slate-500">{row.created_by || '—'}</span>,
    },
    {
      header: 'Descrizione',
      cell: (row) => <span className="text-sm">{row.description || '—'}</span>,
    },
    {
      header: 'Importo',
      cell: (row) => <span className="font-semibold text-emerald-600">+{formatCurrency(row.amount || 0)}</span>,
    },
  ];

  const expenseColumns = [
    {
      header: 'Data',
      cell: (row) => <span className="text-sm">{row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '—'}</span>,
    },
    {
      header: 'Creato da',
      cell: (row) => <span className="text-xs text-slate-500">{row.created_by || '—'}</span>,
    },
    {
      header: 'Descrizione',
      cell: (row) => <span className="text-sm">{row.description || row.nature || '—'}</span>,
    },
    {
      header: 'Importo',
      cell: (row) => <span className="font-semibold text-red-600">-{formatCurrency(row.amount || 0)}</span>,
    },
  ];

  const projectColumns = [
    {
      header: 'Progetto',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.client_name || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Creato da',
      cell: (row) => <span className="text-xs text-slate-500">{row.created_by || '—'}</span>,
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant="outline">{row.status || '—'}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Amministrazione"
        description="Accesso globale a tutti i dati — Solo Sviluppatori"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
          <Shield className="h-4 w-4" />
          Sviluppatore
        </div>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{allUsers.length}</p>
                <p className="text-xs text-slate-500">Utenti Totali</p>
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-slate-500">{clienteUsers} Clienti</span>
              <span className="text-purple-600">{sviluppatoreUsers} Sviluppatori</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-slate-500">Ricavi Totali (tutti)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg"><Receipt className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-slate-500">Spese Totali (tutti)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><Database className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{allProjects.length}</p>
                <p className="text-xs text-slate-500">Progetti Totali (tutti)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1.5" /> Utenti
          </TabsTrigger>
          <TabsTrigger value="revenues">
            <TrendingUp className="h-4 w-4 mr-1.5" /> Ricavi
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="h-4 w-4 mr-1.5" /> Spese
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Database className="h-4 w-4 mr-1.5" /> Progetti
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Clock className="h-4 w-4 mr-1.5" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestione Utenti</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Cerca per email o nome..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={userColumns}
                data={filteredUsers}
                emptyMessage="Nessun utente trovato."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenues" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tutti i Ricavi — Vista Globale</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={revenueColumns}
                data={allRevenues}
                emptyMessage="Nessun ricavo nel database."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tutte le Spese — Vista Globale</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={expenseColumns}
                data={allExpenses}
                emptyMessage="Nessuna spesa nel database."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tutti i Progetti — Vista Globale</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={projectColumns}
                data={allProjects}
                emptyMessage="Nessun progetto nel database."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Audit Logs — Ultime 200 azioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={auditColumns}
                data={auditLogs}
                emptyMessage="Nessun log di audit registrato."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}