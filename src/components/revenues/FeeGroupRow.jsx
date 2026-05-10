import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Layers, CheckCircle, Clock, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';
import { getTagStyle } from '../hooks/useCustomTags';
import { createPageUrl } from '../../utils';

/**
 * Riga aggregata "Compenso" nella pagina Ricavi: raggruppa tutti i revenue
 * dello stesso fee_id in una singola riga espandibile.
 */
export default function FeeGroupRow({
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

  const handleEditFee = () => {
    if (!fee?.id) return;
    navigate(`${createPageUrl('Fees')}?feeId=${fee.id}`);
  };

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
    <>
      <tr className="hover:bg-slate-50/50 border-b border-slate-100">
        <td className="py-3 px-4 align-top">
          <span className="text-slate-600 text-sm">
            {lastDate ? format(new Date(lastDate), 'MMM d, yyyy') : '—'}
          </span>
        </td>
        <td className="py-3 px-4 align-top">
          <div>
            <p className="font-medium text-slate-900">{title}</p>
            {fee?.project_name && (
              <p className="text-xs text-slate-500">{fee.project_name}</p>
            )}
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{revenues.length} {revenues.length === 1 ? 'incasso' : 'incassi'}</span>
              <span className="text-slate-400">·</span>
              <span className={cn(isComplete ? "text-emerald-600" : "text-amber-600")}>
                {formatCurrency(totalIncassato)} / {formatCurrency(feeAmount)}
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </td>
        <td className="py-3 px-4 align-top">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={tagColor ? getTagStyle(tagColor) : {}}
          >
            {tag}
          </span>
        </td>
        <td className="py-3 px-4 align-top">
          <div className="text-right">
            <span className="font-semibold text-emerald-600">
              +{formatCurrency(totalIncassato)}
            </span>
            {residuo > 0.01 && (
              <p className="text-[11px] text-amber-600 mt-0.5">
                ⏳ Residuo {formatCurrency(residuo)}
              </p>
            )}
          </div>
        </td>
        <td className="py-3 px-4 align-top w-12">
          {fee?.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditFee}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifica compenso (nome e tag)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={5} className="bg-slate-50/60 border-b border-slate-100 px-4 py-3">
            <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
              {/* Progress bar */}
              <div className="px-3 pt-3 pb-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {sortedRevenues.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">
                          {rev.description || 'Incasso'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {rev.date ? format(new Date(rev.date), 'MMM d, yyyy') : '—'}
                          {rev.payment_method && (
                            <> · {rev.payment_method === 'cash' ? 'Contanti' : 'Banca'}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                  <div className="flex items-center justify-between px-3 py-2 bg-amber-50/50">
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
          </td>
        </tr>
      )}
    </>
  );
}