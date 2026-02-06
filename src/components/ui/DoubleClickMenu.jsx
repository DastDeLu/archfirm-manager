import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, Trash2 } from 'lucide-react';

export default function DoubleClickMenu({ children, onEdit, onDelete }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onEdit && (
          <ContextMenuItem onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Modifica
          </ContextMenuItem>
        )}
        {onDelete && (
          <ContextMenuItem onClick={onDelete} className="gap-2 text-red-600">
            <Trash2 className="h-4 w-4" />
            Elimina
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}