import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Layers, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrency } from '../lib/formatters';
import { getTagStyle } from '../hooks/useCustomTags';

export default function MobileExpenseCard({ expense, tagColor, onEdit, onDelete }) {
  const title = expense.description || expense.nature || 'Nessuna descrizione';
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-500">
          {expense.date ? format(new Date(expense.date), 'd MMM yyyy', { locale: it }) : '—'}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(expense)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(expense)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="font-semibold text-slate-900 leading-snug mb-1">
        {title}
      </p>

      {expense.expense_type === 'fixed' && expense.payment_frequency && (
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mb-2">
          {expense.payment_frequency}
        </span>
      )}

      {expense.chapter_name && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
          <Layers className="h-3 w-3" />
          <span>{expense.chapter_name}</span>
        </div>
      )}

      <div className="flex items-end justify-between mt-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded-md border"
          style={tagColor ? getTagStyle(tagColor) : {}}
        >
          {expense.tag || 'Altro'}
        </span>
        <span className="font-bold text-red-600">
          -{formatCurrency(expense.amount || 0)}
        </span>
      </div>
    </div>
  );
}