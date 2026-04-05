import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '../lib/formatters';

export default function DeltaWidget({
  previousYear,
  currentYear,
  previousTotal,
  currentTotal,
}) {
  const delta = currentTotal - previousTotal;
  const isPositive = delta >= 0;
  const deltaPercent =
    previousTotal > 0 ? ((delta / previousTotal) * 100).toFixed(1) : null;

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-slate-500 mb-1">
          Delta {previousYear} -> {currentYear}
        </p>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <ArrowUpRight className="h-5 w-5 text-emerald-600" />
          ) : (
            <ArrowDownRight className="h-5 w-5 text-red-600" />
          )}
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}
            {formatCurrency(delta)}
          </p>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {deltaPercent === null
            ? 'Nessun baseline sull anno precedente'
            : `${isPositive ? '+' : ''}${deltaPercent}% rispetto al ${previousYear}`}
        </p>
      </CardContent>
    </Card>
  );
}
