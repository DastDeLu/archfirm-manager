import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Layers, Calendar, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';

/**
 * Dropdown in pagina Ricavi: mostra le rate pagate di un compenso collegato.
 * Puro componente UI, non modifica dati.
 */
export default function RevenueInstallmentsDropdown({ feeId, feeAmount, totalIncassato }) {
  const [open, setOpen] = useState(false);

  const { data: installments = [] } = useQuery({
    queryKey: ['installments-by-fee', feeId],
    queryFn: () => base44.entities.Installment.filter({ fee_id: feeId }),
    enabled: !!feeId,
  });

  const paidInstallments = installments
    .filter(i => i.status === 'paid')
    .sort((a, b) => (a.paid_date || a.due_date || '').localeCompare(b.paid_date || b.due_date || ''));

  const allInstallments = installments
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  if (installments.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{paidInstallments.length}/{installments.length} rate</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden min-w-[260px] max-w-xs">
          <div className="px-3 py-2 bg-blue-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Rate Compenso</span>
            </div>
            <span className="text-xs text-slate-500">
              {formatCurrency(totalIncassato)} / {formatCurrency(feeAmount)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="px-3 pt-2 pb-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, feeAmount > 0 ? (totalIncassato / feeAmount) * 100 : 0)}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {allInstallments.map((inst) => {
              const isPaid = inst.status === 'paid';
              const isOverdue = inst.status === 'overdue';
              return (
                <div key={inst.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Clock className={cn("h-3.5 w-3.5 flex-shrink-0", isOverdue ? "text-red-500" : "text-amber-500")} />
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          inst.kind === 'acconto' ? 'bg-blue-100 text-blue-700' :
                          inst.kind === 'saldo' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {inst.kind === 'acconto' ? 'Acconto' : inst.kind === 'saldo' ? 'Saldo' : 'Rata'}
                        </span>
                        {inst.google_event_id && (
                          <Calendar className="h-3 w-3 text-blue-400" title="Sync Calendar" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isPaid && inst.paid_date ? `Pagata: ${inst.paid_date}` : `Scadenza: ${inst.due_date || '—'}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-semibold",
                      isPaid ? "text-emerald-700" : isOverdue ? "text-red-600" : "text-slate-700"
                    )}>
                      {formatCurrency(inst.amount || 0)}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">
                      {inst.payment_method === 'cash' ? 'Contanti' : inst.payment_method === 'bank' ? 'Banca' : inst.payment_method || '—'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}