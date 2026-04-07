import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Pencil, Trash2 } from 'lucide-react';

export default function ContextMenuWrapper({ children, onEdit, onDelete }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="inline-flex w-full justify-end">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onEdit?.()}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifica
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onDelete?.()} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Elimina
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}