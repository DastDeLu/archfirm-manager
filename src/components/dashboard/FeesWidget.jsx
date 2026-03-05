import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';

export default function FeesWidget() {
  const { data: fees = [] } = useQuery({
    queryKey: ['fees'],
    queryFn: () => base44.entities.Fee.list(),
  });

  const stats = useMemo(() => {
    const toCollect = fees
      .filter(f => f.payment_status === 'Da incassare')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    
    const collected = fees
      .filter(f => f.payment_status === 'Incassati')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    return { toCollect, collected };
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
              <p className="text-sm text-amber-700 font-medium">Da Incassare</p>
              <p className="text-xs text-amber-600 mt-1">Compensi attesi</p>
            </div>
            <p className="text-xl font-bold text-amber-700">
              €{stats.toCollect.toLocaleString('it-IT')}
            </p>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <div>
              <p className="text-sm text-emerald-700 font-medium">Incassati</p>
              <p className="text-xs text-emerald-600 mt-1">Compensi ricevuti</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              €{stats.collected.toLocaleString('it-IT')}
            </p>
          </div>
          
          <div className="flex items-center justify-center pt-2 border-t">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                Totale: €{(stats.toCollect + stats.collected).toLocaleString('it-IT')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}