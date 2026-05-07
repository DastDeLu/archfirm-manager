import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DEFAULT_COLOR_COMPLETE = '#22c55e';
const DEFAULT_COLOR_INCOMPLETE = '#FF0000';

/**
 * Barra verticale di stato per un GRUPPO di compensi (es. tutti i compensi di un cliente).
 * Il gruppo è "complete" solo se TUTTI i fees hanno info_completion_status === 'complete'.
 * Cliccando si applica il nuovo stato a tutti i compensi del gruppo.
 */
export default function FeeGroupCompletionBar({ fees = [], colorComplete, colorIncomplete, onColorsChange }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef(null);
  const queryClient = useQueryClient();

  const allComplete = fees.length > 0 && fees.every(f => f?.info_completion_status === 'complete');
  const status = allComplete ? 'complete' : 'incomplete';
  const barColor = status === 'complete'
    ? (colorComplete || DEFAULT_COLOR_COMPLETE)
    : (colorIncomplete || DEFAULT_COLOR_INCOMPLETE);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleStatus = async (e) => {
    e.stopPropagation();
    if (!fees.length) return;
    setSaving(true);
    const newStatus = status === 'complete' ? 'incomplete' : 'complete';
    await Promise.all(
      fees.map(f => base44.entities.Fee.update(f.id, { info_completion_status: newStatus }))
    );
    queryClient.invalidateQueries({ queryKey: ['fees'] });
    toast.success(newStatus === 'complete' ? 'Compensi segnati come completi' : 'Compensi segnati come non completi');
    setSaving(false);
    setOpen(false);
  };

  const updateGlobalColor = async (which, hex) => {
    if (!hex) return;
    setSaving(true);
    const me = await base44.auth.me();
    const prefs = await base44.entities.UserPreferences.filter({ user_email: me.email });
    const field = which === 'complete' ? 'fee_color_complete' : 'fee_color_incomplete';
    if (prefs && prefs.length > 0) {
      await base44.entities.UserPreferences.update(prefs[0].id, { [field]: hex });
    } else {
      await base44.entities.UserPreferences.create({ user_email: me.email, [field]: hex });
    }
    toast.success('Colore globale aggiornato');
    onColorsChange && onColorsChange();
    setSaving(false);
  };

  return (
    <div className="relative flex-shrink-0 self-stretch" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-2 h-full min-h-[64px] rounded-l-xl transition-opacity hover:opacity-80 focus:outline-none"
        style={{ backgroundColor: barColor }}
        title={status === 'complete' ? 'Tutti completi — clicca per opzioni' : 'Almeno uno non completo — clicca per opzioni'}
        disabled={saving}
      />

      {open && (
        <div
          className="absolute left-4 top-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-64"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Stato gruppo ({fees.length})</p>

          <button
            type="button"
            onClick={toggleStatus}
            disabled={saving}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors mb-4 text-sm font-medium"
            style={{
              borderColor: barColor,
              color: barColor,
              backgroundColor: barColor + '18'
            }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: barColor }}
            />
            {status === 'complete' ? 'Completo — segna tutti come non completi' : 'Non completo — segna tutti come completi'}
          </button>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Colori globali</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600">Completo</span>
              <input
                type="color"
                defaultValue={colorComplete || DEFAULT_COLOR_COMPLETE}
                className="w-9 h-7 rounded cursor-pointer border border-slate-200"
                onBlur={e => updateGlobalColor('complete', e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600">Non completo</span>
              <input
                type="color"
                defaultValue={colorIncomplete || DEFAULT_COLOR_INCOMPLETE}
                className="w-9 h-7 rounded cursor-pointer border border-slate-200"
                onBlur={e => updateGlobalColor('incomplete', e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}