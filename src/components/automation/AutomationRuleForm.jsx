import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const OPERATORS = [
  { value: 'equals', label: 'uguale a' },
  { value: 'not_equals', label: 'diverso da' },
  { value: 'greater_than', label: 'maggiore di' },
  { value: 'less_than', label: 'minore di' },
  { value: 'greater_or_equal', label: 'maggiore o uguale a' },
  { value: 'less_or_equal', label: 'minore o uguale a' },
  { value: 'contains', label: 'contiene' },
  { value: 'not_contains', label: 'non contiene' },
  { value: 'changed', label: 'è cambiato' },
  { value: 'changed_to', label: 'è cambiato a' }
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Invia Email' },
  { value: 'send_notification', label: 'Notifica In-App' },
  { value: 'update_entity', label: 'Aggiorna Entità' },
  { value: 'create_objective', label: 'Crea Obiettivo' }
];

const ENTITY_FIELDS = {
  Project: ['budget', 'status', 'priority', 'name'],
  Installment: ['status', 'due_date', 'amount'],
  Expense: ['amount', 'tag', 'expense_type', 'stato'],
  Objective: ['current_value', 'target_value', 'status'],
  Fee: ['payment_status', 'amount', 'category'],
  Revenue: ['amount', 'tag', 'payment_method']
};

export default function AutomationRuleForm({ rule, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    trigger_entity: rule?.trigger_entity || 'Project',
    trigger_event: rule?.trigger_event || 'update',
    conditions: rule?.conditions || [{ field: '', operator: 'equals', value: '' }],
    actions: rule?.actions || [{ type: 'send_notification', config: {} }],
    notification_type: rule?.notification_type || 'both',
    recipients: rule?.recipients || ['admin'],
    is_active: rule?.is_active !== undefined ? rule.is_active : true
  });

  const [recipientInput, setRecipientInput] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (rule) {
        return base44.entities.AutomationRule.update(rule.id, data);
      }
      return base44.entities.AutomationRule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { field: '', operator: 'equals', value: '' }]
    });
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index)
    });
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: 'send_notification', config: {} }]
    });
  };

  const removeAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...formData.actions];
    if (field === 'type') {
      newActions[index] = { type: value, config: {} };
    } else {
      newActions[index] = {
        ...newActions[index],
        config: { ...newActions[index].config, [field]: value }
      };
    }
    setFormData({ ...formData, actions: newActions });
  };

  const addRecipient = () => {
    if (recipientInput && !formData.recipients.includes(recipientInput)) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, recipientInput]
      });
      setRecipientInput('');
    }
  };

  const removeRecipient = (recipient) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter(r => r !== recipient)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Regola *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="es. Alert budget progetto al 90%"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Descrizione</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrivi cosa fa questa regola"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="trigger_entity">Entità Trigger *</Label>
            <Select
              value={formData.trigger_entity}
              onValueChange={(value) => setFormData({ ...formData, trigger_entity: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Project">Progetto</SelectItem>
                <SelectItem value="Installment">Rata</SelectItem>
                <SelectItem value="Expense">Spesa</SelectItem>
                <SelectItem value="Objective">Obiettivo</SelectItem>
                <SelectItem value="Fee">Compenso</SelectItem>
                <SelectItem value="Revenue">Ricavo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="trigger_event">Evento Trigger *</Label>
            <Select
              value={formData.trigger_event}
              onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">Creazione</SelectItem>
                <SelectItem value="update">Aggiornamento</SelectItem>
                <SelectItem value="delete">Eliminazione</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Condizioni *</Label>
          <Button type="button" size="sm" variant="outline" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi
          </Button>
        </div>
        {formData.conditions.map((condition, index) => (
          <div key={index} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-xs">Campo</Label>
              <Select
                value={condition.field}
                onValueChange={(value) => updateCondition(index, 'field', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona campo" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_FIELDS[formData.trigger_entity]?.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Operatore</Label>
              <Select
                value={condition.operator}
                onValueChange={(value) => updateCondition(index, 'operator', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Valore</Label>
              <Input
                className="h-9"
                value={condition.value}
                onChange={(e) => updateCondition(index, 'value', e.target.value)}
                placeholder="valore"
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => removeCondition(index)}
              disabled={formData.conditions.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Azioni *</Label>
          <Button type="button" size="sm" variant="outline" onClick={addAction}>
            <Plus className="h-4 w-4 mr-1" />
            Aggiungi
          </Button>
        </div>
        {formData.actions.map((action, index) => (
          <div key={index} className="space-y-2 p-3 bg-slate-50 rounded-lg">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Tipo Azione</Label>
                <Select
                  value={action.type}
                  onValueChange={(value) => updateAction(index, 'type', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeAction(index)}
                disabled={formData.actions.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Action-specific config */}
            {(action.type === 'send_email' || action.type === 'send_notification') && (
              <div className="space-y-2">
                <Input
                  placeholder="Titolo/Oggetto"
                  value={action.config.title || action.config.subject || ''}
                  onChange={(e) => updateAction(index, action.type === 'send_email' ? 'subject' : 'title', e.target.value)}
                />
                <Textarea
                  placeholder="Messaggio (usa {campo} per valori dinamici, es. {budget})"
                  value={action.config.message || ''}
                  onChange={(e) => updateAction(index, 'message', e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="notification_type">Tipo Notifica</Label>
          <Select
            value={formData.notification_type}
            onValueChange={(value) => setFormData({ ...formData, notification_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Solo Email</SelectItem>
              <SelectItem value="in_app">Solo In-App</SelectItem>
              <SelectItem value="both">Email + In-App</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Destinatari</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              placeholder="email@example.com o 'admin' / 'user'"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
            />
            <Button type="button" size="sm" onClick={addRecipient}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.recipients.map(recipient => (
              <Badge key={recipient} variant="secondary" className="gap-1">
                {recipient}
                <button
                  type="button"
                  onClick={() => removeRecipient(recipient)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Salvataggio...' : (rule ? 'Aggiorna' : 'Crea Regola')}
        </Button>
      </div>
    </form>
  );
}