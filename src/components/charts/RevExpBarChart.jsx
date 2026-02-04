import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function RevExpBarChart({ revenues = [], expenses = [] }) {
  const monthlyData = useMemo(() => {
    const months = {};
    const currentYear = new Date().getFullYear();
    
    // Initialize months
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthName = new Date(currentYear, i).toLocaleString('en', { month: 'short' });
      months[monthKey] = { 
        month: monthName, 
        revenue: 0,
        expense: 0,
        net: 0
      };
    }

    // Aggregate revenues
    revenues.forEach(r => {
      if (r.date) {
        const key = r.date.substring(0, 7);
        if (months[key]) months[key].revenue += r.amount || 0;
      }
    });

    // Aggregate expenses
    expenses.forEach(e => {
      if (e.date) {
        const key = e.date.substring(0, 7);
        if (months[key]) months[key].expense += e.amount || 0;
      }
    });

    // Calculate net
    return Object.values(months).map(item => {
      item.net = item.revenue - item.expense;
      return item;
    });
  }, [revenues, expenses]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const revenue = payload.find(p => p.dataKey === 'revenue')?.value || 0;
      const expense = payload.find(p => p.dataKey === 'expense')?.value || 0;
      const net = revenue - expense;

      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-emerald-600">Revenue:</span>
              <span className="text-sm font-medium">€{revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-red-600">Expenses:</span>
              <span className="text-sm font-medium">€{expense.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Net:</span>
              <span className={`text-sm font-bold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                €{net.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barGap={2}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.7}/>
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
                tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="revenue" 
                name="Revenue"
                fill="url(#revenueGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                dataKey="expense" 
                name="Expenses"
                fill="url(#expenseGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}