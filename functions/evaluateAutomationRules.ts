import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId, eventType, data, oldData } = await req.json();

    // Fetch active automation rules for this entity type
    const rules = await base44.asServiceRole.entities.AutomationRule.filter({
      trigger_entity: entityType,
      trigger_event: eventType,
      is_active: true
    });

    const results = [];

    for (const rule of rules) {
      // Evaluate conditions
      const conditionsMet = evaluateConditions(rule.conditions, data, oldData);

      if (conditionsMet) {
        // Execute actions
        for (const action of rule.actions || []) {
          await executeAction(base44, action, data, rule);
        }

        // Update rule stats
        await base44.asServiceRole.entities.AutomationRule.update(rule.id, {
          last_triggered: new Date().toISOString(),
          trigger_count: (rule.trigger_count || 0) + 1
        });

        results.push({ rule: rule.name, status: 'triggered' });
      }
    }

    return Response.json({ 
      success: true, 
      evaluated: rules.length,
      triggered: results.length,
      results 
    });
  } catch (error) {
    console.error('Error evaluating automation rules:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function evaluateConditions(conditions, data, oldData) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(condition => {
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

function getFieldValue(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function parseValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (!isNaN(value) && value !== '') return Number(value);
  return value;
}

async function executeAction(base44, action, data, rule) {
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

async function sendEmailAction(base44, config, data, rule) {
  const recipients = rule.recipients || [];
  
  for (const recipient of recipients) {
    const emailAddress = recipient.includes('@') ? recipient : await getRoleEmails(base44, recipient);
    const emails = Array.isArray(emailAddress) ? emailAddress : [emailAddress];

    for (const email of emails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: config.subject || `Alert: ${rule.name}`,
        body: formatMessage(config.message || rule.description, data)
      });
    }
  }
}

async function sendNotificationAction(base44, config, data, rule) {
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
        action_url: config.action_url
      });
    }
  }
}

async function updateEntityAction(base44, config, data) {
  if (!config.entity_type || !config.updates) return;
  
  const entityId = config.entity_id === 'current' ? data.id : config.entity_id;
  
  await base44.asServiceRole.entities[config.entity_type].update(entityId, config.updates);
}

async function createObjectiveAction(base44, config, data) {
  const objectiveData = {
    name: formatMessage(config.name || 'Obiettivo da Automazione', data),
    description: formatMessage(config.description || '', data),
    unit_type: config.unit_type || 'number',
    target_value: config.target_value || 100,
    current_value: 0,
    success_logic: config.success_logic || 'higher_better',
    deadline: config.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category: config.category || 'Operativo',
    status: 'active'
  };
  
  await base44.asServiceRole.entities.Objective.create(objectiveData);
}

async function getRoleEmails(base44, role) {
  const users = await base44.asServiceRole.entities.User.filter({ role });
  return users.map(u => u.email);
}

function formatMessage(template, data) {
  return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
    const value = getFieldValue(data, path);
    return value !== undefined ? value : match;
  });
}