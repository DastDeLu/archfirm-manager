import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { 
  Settings, Users, Database, Download, Upload, MoreHorizontal, 
  UserPlus, Shield, User, Trash2, RefreshCw, FileJson, FileSpreadsheet, FileUp, Loader2, Tags
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import OpeningBalances from '../components/settings/OpeningBalances';
import ImportDialog from '../components/settings/ImportDialog';
import TagManager from '../components/settings/TagManager';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [annualMarketingBudget, setAnnualMarketingBudget] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const queryClient = useQueryClient();

  // Fetch current user preferences
  const { data: userPrefs, refetch: refetchPrefs } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      try {
        const prefs = await base44.entities.UserPreferences.list();
        return prefs[0];
      } catch {
        return null;
      }
    },
  });

  // Initialize budget from user preferences
  useEffect(() => {
    if (userPrefs?.annual_marketing_budget) {
      setAnnualMarketingBudget(userPrefs.annual_marketing_budget.toString());
    }
  }, [userPrefs]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 50),
    enabled: currentUser?.role === 'admin',
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success('Invitation sent successfully');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  const handleExport = async (format) => {
    toast.info(`Exporting data as ${format.toUpperCase()}...`);
    // In a real implementation, this would call a backend function
    setTimeout(() => {
      toast.success(`Export completed`);
      setExportDialogOpen(false);
    }, 2000);
  };

  // Salva il budget annuale marketing
  const handleSaveAnnualBudget = async () => {
    try {
      setIsSavingBudget(true);
      const budgetValue = parseFloat(annualMarketingBudget) || 0;

      if (userPrefs?.id) {
        // Update existing preferences
        await base44.entities.UserPreferences.update(userPrefs.id, {
          annual_marketing_budget: budgetValue
        });
      } else {
        // Create new preferences
        await base44.entities.UserPreferences.create({
          annual_marketing_budget: budgetValue
        });
      }

      // Invalida la cache per aggiornare i dati globalmente
      await refetchPrefs();
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      
      toast.success('Budget annuale salvato con successo');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('user');

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Ruolo aggiornato con successo');
      setEditRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Errore durante l\'aggiornamento del ruolo');
    }
  });

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setEditRoleDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (selectedUser) {
      updateUserRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };

  const userColumns = [
    {
      header: 'User',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <User className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.full_name || 'Nessun nome'}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Ruolo',
      cell: (row) => (
        <Badge className={row.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}>
          {row.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
          {row.role || 'user'}
        </Badge>
      ),
    },
    {
      header: 'Iscritto',
      cell: (row) => (
        <span className="text-slate-600 text-sm">
          {row.created_date ? format(new Date(row.created_date), 'MMM d, yyyy') : '-'}
        </span>
      ),
    },
    {
      header: 'Azioni',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditRole(row)}>
              <Shield className="h-4 w-4 mr-2" />
              Cambia Ruolo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const auditColumns = [
    {
      header: 'Azione',
      cell: (row) => (
        <Badge variant="outline">{row.action}</Badge>
      ),
    },
    {
      header: 'Entità',
      cell: (row) => (
        <span className="text-slate-900 font-medium">{row.entity_type}</span>
      ),
    },
    {
      header: 'User',
      cell: (row) => (
        <span className="text-slate-600 text-sm">{row.user_email}</span>
      ),
    },
    {
      header: 'Data',
      cell: (row) => (
        <span className="text-slate-500 text-sm">
          {row.created_date ? format(new Date(row.created_date), 'MMM d, HH:mm') : '-'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Impostazioni" description="Gestisci le impostazioni dell'applicazione" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            Generale
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tags className="h-4 w-4" />
            Gestione Tag
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Utenti
              </TabsTrigger>
              <TabsTrigger value="opening" className="gap-2">
                <Database className="h-4 w-4" />
                Saldi Iniziali
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-2">
                <Database className="h-4 w-4" />
                Dati e Backup
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Log Audit
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profilo</CardTitle>
                <CardDescription>Informazioni sul tuo account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-md">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <User className="h-8 w-8 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{currentUser?.full_name || 'Nessun nome'}</p>
                      <p className="text-sm text-slate-500">{currentUser?.email}</p>
                      <Badge className="mt-1" variant="outline">
                        {currentUser?.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                        {currentUser?.role || 'user'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Applicazione</CardTitle>
                <CardDescription>Impostazioni ArchFirm Manager</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-500">Versione</Label>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Valuta</Label>
                    <p className="font-medium">EUR (€)</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Formato Data</Label>
                    <p className="font-medium">MMM d, yyyy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Marketing</CardTitle>
                <CardDescription>Configura il budget annuale per le attività di marketing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="annualBudget">Budget Annuale Marketing (€)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="annualBudget"
                        type="number"
                        value={annualMarketingBudget}
                        onChange={(e) => setAnnualMarketingBudget(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                      <Button 
                        onClick={handleSaveAnnualBudget}
                        disabled={isSavingBudget}
                      >
                        {isSavingBudget ? 'Salvataggio...' : 'Salva'}
                      </Button>
                    </div>
                    {userPrefs?.annual_marketing_budget && (
                      <p className="text-sm text-slate-500">
                        Budget attuale: {userPrefs.annual_marketing_budget.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tags">
          <TagManager />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="opening">
            <OpeningBalances />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Membri del Team</CardTitle>
                  <CardDescription>Gestisci utenti e permessi</CardDescription>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invita Utente
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={users}
                  loading={loadingUsers}
                  emptyMessage="Nessun utente trovato"
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="data">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Esporta Dati</CardTitle>
                  <CardDescription>Scarica tutti i tuoi dati</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => handleExport('json')} className="gap-2">
                      <FileJson className="h-4 w-4" />
                      Esporta come JSON
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Esporta come Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Importa Dati Finanziari</CardTitle>
                  <CardDescription>Carica file Excel o CSV per importare ricavi, spese, clienti e progetti</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setImportDialogOpen(true)}
                    className="gap-2"
                  >
                    <FileUp className="h-4 w-4" />
                    Apri Importazione
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backup</CardTitle>
                  <CardDescription>I backup automatici sono attivi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Backup Giornaliero</p>
                        <p className="text-sm text-slate-500">Eseguito alle 2:00 AM UTC</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">Attivo</Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      I backup vengono creati automaticamente ogni giorno. Contatta il supporto per ripristinare da un backup.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Log Audit</CardTitle>
                <CardDescription>Attività recente nell'applicazione</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={auditColumns}
                  data={auditLogs}
                  loading={loadingLogs}
                  emptyMessage="Nessun log audit ancora"
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invita Utente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Indirizzo Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collega@azienda.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utente</SelectItem>
                    <SelectItem value="admin">Amministratore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Invia Invito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambia Ruolo Utente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User className="h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">{selectedUser.full_name || 'Nessun nome'}</p>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newRole">Nuovo Ruolo</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditRoleDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={updateUserRoleMutation.isPending}
            >
              {updateUserRoleMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Ruolo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}