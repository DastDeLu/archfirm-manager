import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrency } from '../lib/formatters';
import { getTagStyle } from '../hooks/useCustomTags';

export default function MobileRevenueCard({ revenue, tagColor, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-500">
          {revenue.date ? format(new Date(revenue.date), 'd MMM yyyy', { locale: it }) : '—'}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(revenue)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(revenue)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="font-semibold text-slate-900 leading-snug mb-1">
        {revenue.description || 'Nessuna descrizione'}
      </p>
      {revenue.project_name && (
        <p className="text-xs text-slate-500 mb-3">{revenue.project_name}</p>
      )}

      <div className="flex items-end justify-between mt-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded-md border"
          style={tagColor ? getTagStyle(tagColor) : {}}
        >
          {revenue.tag || 'Altro'}
        </span>
        <span className="font-bold text-emerald-600">
          +{formatCurrency(revenue.amount || 0)}
        </span>
      </div>
    </div>
  );
}