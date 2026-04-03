import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, tickCurrency } from '../lib/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CashFlowLineChart({ bankCashEntries = [], pettyCashEntries = [], revenues = [], expenses = [] }) {
  const cashFlowData = useMemo(() => {
    const months = {};
    const currentYear = new Date().getFullYear();
    
    // Initialize months
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthName = new Date(currentYear, i).toLocaleString('it-IT', { month: 'short' });
      months[monthKey] = { 
        month: monthName, 
        bank: 0,
        liquid: 0,
        total: 0
      };
    }

    // Calculate running totals
    let runningBank = 0;
    let runningLiquid = 0;

    const allEntries = [
      ...bankCashEntries.map(e => ({ ...e, source: 'bank' })),
      ...pettyCashEntries.map(e => ({ ...e, source: 'liquid' })),
      ...revenues.map(r => ({ ...r, source: 'revenue', type: 'deposit' })),
      ...expenses.map(e => ({ ...e, source: 'expense', type: 'withdrawal' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    allEntries.forEach(entry => {
      if (!entry.date) return;
      
      const monthKey = entry.date.substring(0, 7);
      if (!months[monthKey]) return;

      const amount = entry.amount || 0;

      if (entry.source === 'bank') {
        runningBank += entry.type === 'deposit' ? amount : -amount;
      } else if (entry.source === 'liquid') {
        runningLiquid += entry.type === 'in' ? amount : -amount;
      } else if (entry.source === 'revenue') {
        runningBank += amount;
      } else if (entry.source === 'expense') {
        runningBank -= amount;
      }

      months[monthKey].bank = runningBank;
      months[monthKey].liquid = runningLiquid;
      months[monthKey].total = runningBank + runningLiquid;
    });

    return Object.values(months);
  }, [bankCashEntries, pettyCashEntries, revenues, expenses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Andamento Flusso di Cassa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                fontSize={12}
                tickMargin={10}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                tickFormatter={tickCurrency}
                tickMargin={10}
              />
              <Tooltip 
                formatter={(value, name) => [formatCurrency(value), name]}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="bank" 
                name="Banca"
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="liquid" 
                name="Liquidi"
                stroke="#f59e0b" 
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                name="Totale"
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}