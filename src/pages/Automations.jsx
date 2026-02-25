import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Zap, Mail, Bell, Edit2, Trash2, TrendingUp, Calendar } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import AutomationRuleForm from '../components/automation/AutomationRuleForm';

export default function Automations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automationRules'],
    queryFn: () => base44.entities.AutomationRule.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AutomationRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => 
      base44.entities.AutomationRule.update(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
    },
  });

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
  };

  const getEntityIcon = (entity) => {
    const icons = {
      Project: '📁',
      Installment: '💰',
      Expense: '💸',
      Objective: '🎯',
      Fee: '💵',
      Revenue: '📈'
    };
    return icons[entity] || '⚙️';
  };

  const getActionIcon = (actionType) => {
    const icons = {
      send_email: <Mail className="h-4 w-4" />,
      send_notification: <Bell className="h-4 w-4" />,
      update_entity: <Edit2 className="h-4 w-4" />,
      create_objective: <TrendingUp className="h-4 w-4" />
    };
    return icons[actionType] || <Zap className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="p-6">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automazioni"
        description="Gestisci regole di automazione per workflow e notifiche"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Regola
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Modifica Regola' : 'Nuova Regola di Automazione'}
              </DialogTitle>
              <DialogDescription>
                Definisci condizioni e azioni per automatizzare i tuoi workflow
              </DialogDescription>
            </DialogHeader>
            <AutomationRuleForm 
              rule={editingRule} 
              onClose={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nessuna automazione configurata
            </h3>
            <p className="text-sm text-slate-500 text-center max-w-md mb-4">
              Inizia creando la tua prima regola di automazione per ricevere notifiche
              ed eseguire azioni automatiche
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Prima Regola
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{getEntityIcon(rule.trigger_entity)}</div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {rule.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="outline">
                          {rule.trigger_entity} • {rule.trigger_event}
                        </Badge>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Attiva' : 'Disattiva'}
                        </Badge>
                        {rule.trigger_count > 0 && (
                          <Badge variant="secondary">
                            <Zap className="h-3 w-3 mr-1" />
                            {rule.trigger_count} trigger
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleMutation.mutate({ id: rule.id, isActive: rule.is_active })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Eliminare questa regola?')) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Conditions */}
                  {rule.conditions && rule.conditions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-2">Condizioni:</h4>
                      <div className="space-y-1">
                        {rule.conditions.map((cond, idx) => (
                          <div key={idx} className="text-sm text-slate-600 bg-slate-50 rounded px-3 py-2">
                            <code className="text-xs">
                              {cond.field} {cond.operator} {cond.value}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {rule.actions && rule.actions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-2">Azioni:</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {rule.actions.map((action, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1">
                            {getActionIcon(action.type)}
                            {action.type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recipients */}
                  {rule.recipients && rule.recipients.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-900 mb-2">Destinatari:</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {rule.recipients.map((recipient, idx) => (
                          <Badge key={idx} variant="outline">
                            {recipient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.last_triggered && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Ultimo trigger: {new Date(rule.last_triggered).toLocaleString('it-IT')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}