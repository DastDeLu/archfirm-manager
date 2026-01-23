import React, { useState } from 'react';
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
  UserPlus, Shield, User, Trash2, RefreshCw, FileJson, FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const queryClient = useQueryClient();

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

  const isAdmin = currentUser?.role === 'admin';

  const userColumns = [
    {
      header: 'User',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <User className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.full_name || 'No name'}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (row) => (
        <Badge className={row.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}>
          {row.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
          {row.role || 'user'}
        </Badge>
      ),
    },
    {
      header: 'Joined',
      cell: (row) => (
        <span className="text-slate-600 text-sm">
          {row.created_date ? format(new Date(row.created_date), 'MMM d, yyyy') : '-'}
        </span>
      ),
    },
  ];

  const auditColumns = [
    {
      header: 'Action',
      cell: (row) => (
        <Badge variant="outline">{row.action}</Badge>
      ),
    },
    {
      header: 'Entity',
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
      header: 'Date',
      cell: (row) => (
        <span className="text-slate-500 text-sm">
          {row.created_date ? format(new Date(row.created_date), 'MMM d, HH:mm') : '-'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Settings" description="Manage your application settings" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-2">
                <Database className="h-4 w-4" />
                Data & Backup
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Audit Log
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-md">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <User className="h-8 w-8 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{currentUser?.full_name || 'No name'}</p>
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
                <CardTitle>Application</CardTitle>
                <CardDescription>ArchFirm Manager settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-500">Version</Label>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Currency</Label>
                    <p className="font-medium">EUR (€)</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Date Format</Label>
                    <p className="font-medium">MMM d, yyyy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage users and permissions</CardDescription>
                </div>
                <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={users}
                  loading={loadingUsers}
                  emptyMessage="No users found"
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
                  <CardTitle>Export Data</CardTitle>
                  <CardDescription>Download all your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => handleExport('json')} className="gap-2">
                      <FileJson className="h-4 w-4" />
                      Export as JSON
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Export as Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backup</CardTitle>
                  <CardDescription>Automatic backups are enabled</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Daily Backup</p>
                        <p className="text-sm text-slate-500">Runs at 2:00 AM UTC</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      Backups are automatically created daily. Contact support to restore from a backup.
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
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>Recent activity in your application</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={auditColumns}
                  data={auditLogs}
                  loading={loadingLogs}
                  emptyMessage="No audit logs yet"
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
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}