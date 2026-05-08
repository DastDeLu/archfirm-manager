// Global undo stack: tracks the last write operation across the entire app.
// Wraps base44.entities.<X>.create/update/delete to record an inverse operation,
// so the user can revert the last action with a single click (or Ctrl+Z).

import { useSyncExternalStore } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import { toast } from 'sonner';

let lastAction = null; // { type, entityName, label, undo: async () => void, ts }
const listeners = new Set();
let installed = false;

function emit() {
  listeners.forEach((l) => l());
}

function setLastAction(action) {
  lastAction = action;
  emit();
}

export function getLastAction() {
  return lastAction;
}

export function clearLastAction() {
  if (lastAction) {
    lastAction = null;
    emit();
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLastAction() {
  return useSyncExternalStore(subscribe, getLastAction, getLastAction);
}

// Strip system fields that the SDK won't accept on create()
const SYSTEM_FIELDS = ['id', '_id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'app_id', 'entity_name', 'is_sample', 'is_deleted', 'deleted_date', 'environment'];
function stripSystemFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  SYSTEM_FIELDS.forEach((k) => delete clone[k]);
  return clone;
}

function invalidateAll() {
  // Conservative refresh of all queries so any list pages re-fetch
  queryClientInstance.invalidateQueries();
}

function recordCreate(entityName, created) {
  const id = created?.id ?? created?._id;
  if (!id) return;
  setLastAction({
    type: 'create',
    entityName,
    label: `Creazione ${entityName}`,
    ts: Date.now(),
    undo: async () => {
      await base44.entities[entityName].delete(id);
      invalidateAll();
    },
  });
}

function recordUpdate(entityName, id, previousData) {
  if (!id || !previousData) return;
  const snapshot = stripSystemFields(previousData);
  setLastAction({
    type: 'update',
    entityName,
    label: `Modifica ${entityName}`,
    ts: Date.now(),
    undo: async () => {
      await base44.entities[entityName].update(id, snapshot);
      invalidateAll();
    },
  });
}

function recordDelete(entityName, previousData) {
  if (!previousData) return;
  const snapshot = stripSystemFields(previousData);
  setLastAction({
    type: 'delete',
    entityName,
    label: `Eliminazione ${entityName}`,
    ts: Date.now(),
    undo: async () => {
      await base44.entities[entityName].create(snapshot);
      invalidateAll();
    },
  });
}

export async function performUndo() {
  const action = lastAction;
  if (!action) return false;
  // Optimistically clear so the user can't double-click
  clearLastAction();
  try {
    await action.undo();
    toast.success(`Annullato: ${action.label}`);
    return true;
  } catch (err) {
    console.error('[undo] failed', err);
    toast.error("Impossibile annullare l'operazione");
    // Restore the action so user can retry
    setLastAction(action);
    return false;
  }
}

// Wrap every entity in base44.entities so create/update/delete record an undo step.
// Skip the User entity (immutable system entity) and AuditLog (history).
const SKIP_ENTITIES = new Set(['User', 'AuditLog']);

export function installUndoInterceptors() {
  if (installed) return;
  const entities = base44?.entities;
  if (!entities) return;

  Object.keys(entities).forEach((entityName) => {
    if (SKIP_ENTITIES.has(entityName)) return;
    const entity = entities[entityName];
    if (!entity || typeof entity !== 'object') return;

    const originalCreate = entity.create?.bind(entity);
    const originalUpdate = entity.update?.bind(entity);
    const originalDelete = entity.delete?.bind(entity);
    const originalGet = entity.get?.bind(entity);
    const originalFilter = entity.filter?.bind(entity);

    if (originalCreate) {
      entity.create = async (...args) => {
        const result = await originalCreate(...args);
        try { recordCreate(entityName, result); } catch (e) { console.warn('[undo] record create failed', e); }
        return result;
      };
    }

    if (originalUpdate) {
      entity.update = async (id, data, ...rest) => {
        let previous = null;
        try {
          if (originalGet) previous = await originalGet(id);
          else if (originalFilter) {
            const list = await originalFilter({ id });
            previous = Array.isArray(list) ? list[0] : null;
          }
        } catch { /* ignore snapshot errors */ }
        const result = await originalUpdate(id, data, ...rest);
        try { recordUpdate(entityName, id, previous); } catch (e) { console.warn('[undo] record update failed', e); }
        return result;
      };
    }

    if (originalDelete) {
      entity.delete = async (id, ...rest) => {
        let previous = null;
        try {
          if (originalGet) previous = await originalGet(id);
          else if (originalFilter) {
            const list = await originalFilter({ id });
            previous = Array.isArray(list) ? list[0] : null;
          }
        } catch { /* ignore snapshot errors */ }
        const result = await originalDelete(id, ...rest);
        try { recordDelete(entityName, previous); } catch (e) { console.warn('[undo] record delete failed', e); }
        return result;
      };
    }
  });

  installed = true;
}