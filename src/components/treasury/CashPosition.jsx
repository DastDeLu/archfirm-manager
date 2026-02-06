import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { isAfter, parseISO } from 'date-fns';

export default function CashPosition() {
  const { data: bankCash = [] } = useQuery({
    queryKey: ['bankcash'],
    queryFn: () => base44.entities.BankCash.list(),
  });

  const { data: pettyCash = [] } = useQuery({
    queryKey: ['pettycash'],
    queryFn: () => base44.entities.PettyCash.list(),
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['installments'],
    queryFn: () => base44.entities.Installment.list(),
  });

  // Calculate real cash (available now)
  const bankBalance = bankCash.reduce((sum, t) => {
    return sum + (t.type === 'deposit' ? t.amount : -t.amount);
  }, 0);

  const pettyBalance = pettyCash.reduce((sum, t) => {
    return sum + (t.type === 'in' ? t.amount : -t.amount);
  }, 0);

  const realCash = bankBalance + pettyBalance;

  // Calculate expected cash (pending installments)
  const today = new Date();
  const pendingInstallments = installments.filter(i => 
    i.status !== 'paid' && i.status !== 'cancelled'
  );

  const expectedCash = pendingInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);

  // Calculate overdue
  const overdueInstallments = pendingInstallments.filter(i => 
    i.due_date && isAfter(today, parseISO(i.due_date))
  );
  const overdueCash = overdueInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);

  // Total projected cash
  const totalProjectedCash = realCash + expectedCash;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm text-emerald-700 font-medium">Cassa Reale</p>
          </div>
          <p className="text-2xl font-bold text-emerald-900">
            €{realCash.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Banca: €{bankBalance.toLocaleString('it-IT')} | Contanti: €{pettyBalance.toLocaleString('it-IT')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-blue-700 font-medium">Cassa Prevista</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            €{expectedCash.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {pendingInstallments.length} rate in attesa
          </p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm text-purple-700 font-medium">Totale Proiettato</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            €{totalProjectedCash.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Reale + Prevista
          </p>
        </CardContent>
      </Card>

      {overdueCash > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-sm text-red-700 font-medium">Scaduto</p>
            </div>
            <p className="text-2xl font-bold text-red-900">
              €{overdueCash.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-red-600 mt-1">
              {overdueInstallments.length} rate scadute
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}