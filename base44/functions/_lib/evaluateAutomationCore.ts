/**
 * Core automation evaluation logic shared by the HTTP entrypoint and triggerAutomation.
 * Keeping this in-process avoids a nested functions.invoke that would drop user/session context
 * and would fail requireUser on the child HTTP handler.
 */

export interface EvaluateAutomationInput {
  entityType: string;
  entityId: string;
  eventType: string | undefined;
  data: Record<string, unknown>;
  oldData: Record<string, unknown> | undefined;
}

export async function runEvaluateAutomationRules(
  base44: any,
  { entityType, entityId: _entityId, eventType, data, oldData }: EvaluateAutomationInput,
) {
  void _entityId; // reserved for future server-side reload of entity by id before actions
  const rules = await base44.asServiceRole.entities.AutomationRule.filter({
    trigger_entity: entityType,
    trigger_event: eventType,
    is_active: true,
  });

  const results: { rule: string; status: string }[] = [];

  for (const rule of rules) {
    const conditionsMet = evaluateConditions(rule.conditions, data, oldData);

    if (conditionsMet) {
      for (const action of rule.actions || []) {
        await executeAction(base44, action, data, rule);
      }

      await base44.asServiceRole.entities.AutomationRule.update(rule.id, {
        last_triggered: new Date().toISOString(),
        trigger_count: (rule.trigger_count || 0) + 1,
      });

      results.push({ rule: rule.name, status: 'triggered' });
    }
  }

  return {
    success: true,
    evaluated: rules.length,
    triggered: results.length,
    results,
  };
}

function evaluateConditions(conditions: any, data: any, oldData: any) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition: any) => {
    const fieldValue = getFieldValue(data, condition.field);
    const oldFieldValue = oldData ? getFieldValue(oldData, condition.field) : null;
    const conditionValue = parseValue(condition.value);

    switch (condition.operator) {
      case 'equals':
        return fieldValue == conditionValue;
      case 'not_equals':
        return fieldValue != conditionValue;
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'greater_or_equal':
        return Number(fieldValue) >= Number(conditionValue);
      case 'less_or_equal':
        return Number(fieldValue) <= Number(conditionValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'changed':
        return fieldValue !== oldFieldValue;
      case 'changed_to':
        return fieldValue === conditionValue && oldFieldValue !== conditionValue;
      default:
        return false;
    }
  });
}

function getFieldValue(obj: any, path: string) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function parseValue(value: any) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
}

async function executeAction(base44: any, action: any, data: any, rule: any) {
  const config = action.config || {};

  switch (action.type) {
    case 'send_email':
      await sendEmailAction(base44, config, data, rule);
      break;
    case 'send_notification':
      await sendNotificationAction(base44, config, data, rule);
      break;
    case 'update_entity':
      await updateEntityAction(base44, config, data);
      break;
    case 'create_objective':
      await createObjectiveAction(base44, config, data);
      break;
  }
}

async function sendEmailAction(base44: any, config: any, data: any, rule: any) {
  const recipients = rule.recipients || [];

  for (const recipient of recipients) {
    const emailAddress = recipient.includes('@') ? recipient : await getRoleEmails(base44, recipient);
    const emails = Array.isArray(emailAddress) ? emailAddress : [emailAddress];

    for (const email of emails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: config.subject || `Alert: ${rule.name}`,
        body: formatMessage(config.message || rule.description, data),
      });
    }
  }
}

async function sendNotificationAction(base44: any, config: any, data: any, rule: any) {
  const recipients = rule.recipients || [];

  for (const recipient of recipients) {
    const emailAddress = recipient.includes('@') ? recipient : await getRoleEmails(base44, recipient);
    const emails = Array.isArray(emailAddress) ? emailAddress : [emailAddress];

    for (const email of emails) {
      await base44.asServiceRole.entities.Notification.create({
        title: config.title || rule.name,
        message: formatMessage(config.message || rule.description, data),
        type: config.notification_type || 'warning',
        category: config.category || 'system',
        recipient_email: email,
        related_entity_type: rule.trigger_entity,
        related_entity_id: data.id,
        automation_rule_id: rule.id,
        action_url: config.action_url,
      });
    }
  }
}

async function updateEntityAction(base44: any, config: any, data: any) {
  if (!config.entity_type || !config.updates) return;

  const entityId = config.entity_id === 'current' ? data.id : config.entity_id;

  await base44.asServiceRole.entities[config.entity_type].update(entityId, config.updates);
}

async function createObjectiveAction(base44: any, config: any, data: any) {
  const objectiveData = {
    name: formatMessage(config.name || 'Obiettivo da Automazione', data),
    description: formatMessage(config.description || '', data),
    unit_type: config.unit_type || 'number',
    target_value: config.target_value || 100,
    current_value: 0,
    success_logic: config.success_logic || 'higher_better',
    deadline: config.deadline ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: config.category || 'Operativo',
    status: 'active',
  };

  await base44.asServiceRole.entities.Objective.create(objectiveData);
}

async function getRoleEmails(base44: any, role: string) {
  const users = await base44.asServiceRole.entities.User.filter({ role });
  return users.map((u: any) => u.email);
}

function formatMessage(template: string, data: any) {
  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
    const value = getFieldValue(data, path);
    return value !== undefined ? value : match;
  });
}
