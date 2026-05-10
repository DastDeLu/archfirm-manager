import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Layers, MoreHorizontal, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';
import { getTagStyle } from '../hooks/useCustomTags';
import { createPageUrl } from '../../utils';

export default function MobileFeeGroupCard({
  fee,
  revenues,
  totalIncassato,
  residuo,
  tagColor,
  onEditRevenue,
  onDeleteRevenue,
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const sortedRevenues = [...revenues].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '')
  );
  const lastDate = sortedRevenues.length > 0 ? sortedRevenues[sortedRevenues.length - 1].date : null;
  const feeAmount = fee?.amount || 0;
  const progress = feeAmount > 0 ? Math.min(100, (totalIncassato / feeAmount) * 100) : 0;
  const isComplete = residuo <= 0.01;

  const title = fee
    ? `Incassi compenso — ${fee.client_name || ''}${fee.project_name ? ' · ' + fee.project_name : ''}`
    : 'Incassi compenso';

  const tag = fee?.category || revenues[0]?.tag || 'Altro';

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-500">
          {lastDate ? format(new Date(lastDate), 'd MMM yyyy', { locale: it }) : '—'}
        </span>
        {fee?.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`${createPageUrl('Fees')}?feeId=${fee.id}`)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifica compenso
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="font-semibold text-slate-900 leading-snug mb-1 line-clamp-2">{title}</p>
      {fee?.project_name && (
        <p className="text-xs text-slate-500 mb-2">{fee.project_name}</p>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Layers className="h-3.5 w-3.5" />
        <span>{revenues.length} {revenues.length === 1 ? 'incasso' : 'incassi'}</span>
        <span className="text-slate-400">·</span>
        <span className={cn(isComplete ? "text-emerald-600" : "text-amber-600")}>
          {formatCurrency(totalIncassato)} / {formatCurrency(feeAmount)}
        </span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      <div className="flex items-end justify-between mt-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded-md border"
          style={tagColor ? getTagStyle(tagColor) : {}}
        >
          {tag}
        </span>
        <div className="text-right">
          <p className="font-bold text-emerald-600">
            +{formatCurrency(totalIncassato)}
          </p>
          {residuo > 0.01 && (
            <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              Residuo {formatCurrency(residuo)}
            </p>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="divide-y divide-slate-100">
            {sortedRevenues.map((rev) => (
              <div key={rev.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {rev.description || 'Incasso'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {rev.date ? format(new Date(rev.date), 'd MMM yyyy', { locale: it }) : '—'}
                      {rev.payment_method && (
                        <> · {rev.payment_method === 'cash' ? 'Contanti' : 'Banca'}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-emerald-700">
                    +{formatCurrency(rev.amount || 0)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditRevenue(rev)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDeleteRevenue(rev)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {residuo > 0.01 && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700 italic">Residuo da incassare</p>
                </div>
                <span className="text-sm font-semibold text-amber-600">
                  {formatCurrency(residuo)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}