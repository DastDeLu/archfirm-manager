import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import CashPosition from '../components/treasury/CashPosition';
import YoYComparison from '../components/analytics/YoYComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Treasury() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tesoreria" 
        description="Vista unificata della posizione finanziaria e analisi avanzate"
      />

      <CashPosition />

      <Tabs defaultValue="yoy" className="w-full">
        <TabsList>
          <TabsTrigger value="yoy">Confronto Anno su Anno</TabsTrigger>
          <TabsTrigger value="forecast">Previsioni Dinamiche</TabsTrigger>
        </TabsList>
        <TabsContent value="yoy" className="mt-6">
          <YoYComparison year={selectedYear} />
        </TabsContent>
        <TabsContent value="forecast" className="mt-6">
          <div className="text-center py-12 text-slate-500">
            Sezione Previsioni Dinamiche - Vai alla pagina Previsioni per i dettagli completi
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}