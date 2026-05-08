import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { useLastAction, performUndo } from '@/lib/undoStack';

export default function UndoButton() {
  const lastAction = useLastAction();
  const disabled = !lastAction;

  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        const target = e.target;
        const tag = target?.tagName;
        // Don't intercept undo while typing in inputs/textareas/contenteditable
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
        e.preventDefault();
        performUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => performUndo()}
      disabled={disabled}
      className="gap-2 text-slate-600"
      title={lastAction ? `Annulla: ${lastAction.label}` : 'Nessuna operazione da annullare'}
    >
      <Undo2 className="h-4 w-4" />
      <span className="hidden sm:inline">Annulla</span>
      <kbd className="ml-1 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 text-[10px] font-medium hidden md:inline-flex">
        ⌘Z
      </kbd>
    </Button>
  );
}