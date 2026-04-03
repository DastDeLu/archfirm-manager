import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { useCashForecastInputs } from '../../hooks/useCashForecastInputs';

export default function FeesWidget() {
  const { data: fees = [] } = useQuery({
    queryKey: ['fees'],
    queryFn: () => base44.entities.Fee.list(),
  });

  const { data: cashData = { deltaIncassiYTD: 0 } } = useCashForecastInputs();

  const stats = useMemo(() => {
    const toCollect = fees
      .filter(f => f.payment_status === 'Da incassare')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    
    const byMethodToCollect = fees
      .filter((fee) => fee.payment_status === 'Da incassare')
      .reduce((acc, fee) => {
        const method = fee.payment_method === 'Contanti' ? 'Contanti' : 'Banca';
        acc[method] += fee.amount || 0;
        return acc;
      }, { Banca: 0, Contanti: 0 });

    return { toCollect, byMethodToCollect };
  }, [fees]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-amber-600" />
          Previsionale Incassi
        </CardTitle>
        <Link to={createPageUrl('Fees')}>
          <Button variant="ghost" size="sm">Vedi Tutti</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
            <div>
              <p className="text-sm text-amber-700 font-medium">Banca da incassare</p>
              <p className="text-xs text-amber-600 mt-1">Compensi attesi</p>
            </div>
            <p className="text-xl font-bold text-amber-700">
              {formatCurrency(stats.byMethodToCollect.Banca)}
            </p>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <div>
              <p className="text-sm text-emerald-700 font-medium">Liquidi da incassare</p>
              <p className="text-xs text-emerald-600 mt-1">Rate in contanti</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(stats.byMethodToCollect.Contanti)}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-700 font-medium">Delta incassi (YTD vs target)</p>
              <p className="text-xs text-slate-500 mt-1">Effettivo YTD - target YTD</p>
            </div>
            <p className={`text-lg font-bold ${cashData.deltaIncassiYTD >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {cashData.deltaIncassiYTD >= 0 ? '+' : ''}{formatCurrency(cashData.deltaIncassiYTD)}
            </p>
          </div>
          
          <div className="flex items-center justify-center pt-2 border-t">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                Totale da incassare: {formatCurrency(stats.toCollect)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}