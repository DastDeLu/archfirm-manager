import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus, ArrowDownCircle, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { cn } from '@/lib/utils';

/**
 * Dropdown per un singolo compenso (Fee) che mostra i ricavi collegati
 * e permette di aggiungere un nuovo incasso.
 */
export default function FeeRevenueDropdown({ fee, onAddIncasso }) {
  const [open, setOpen] = useState(false);

  const { data: revenues = [] } = useQuery({
    queryKey: ['revenues-by-fee', fee.id],
    queryFn: () => base44.entities.Revenue.filter({ fee_id: fee.id }),
  });

  const totalIncassato = revenues.reduce((sum, r) => sum + (r.amount || 0), 0);
  const remaining = (fee.amount || 0) - totalIncassato;
  const isFullyCollected = fee.payment_status === 'Incassati';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border",
            isFullyCollected
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          )}
        >
          {isFullyCollected ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span>{formatCurrency(fee.amount || 0)}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden min-w-[280px]">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Incassi registrati</span>
            {!isFullyCollected && (
              <span className="text-xs text-amber-600 font-medium">
                Rimanente: {formatCurrency(remaining)}
              </span>
            )}
          </div>

          {/* Revenue list */}
          <div className="divide-y divide-slate-100">
            {revenues.length === 0 ? (
              <p className="text-xs text-slate-400 px-3 py-3 text-center">Nessun incasso registrato</p>
            ) : (
              revenues.map(rev => (
                <div key={rev.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-500">{rev.date}</p>
                    {rev.description && (
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{rev.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrency(rev.amount || 0)}</p>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {rev.payment_method === 'bank_transfer' ? 'Banca' : 'Contanti'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add incasso button */}
          {!isFullyCollected && (
            <div className="p-2 border-t border-slate-200">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAddIncasso(fee);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Registra Incasso
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}