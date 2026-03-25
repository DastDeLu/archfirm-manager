import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Info } from 'lucide-react';

export default function GoogleCalendarSettings() {
  // Check connectivity by calling the connector
  const { data: status, isLoading } = useQuery({
    queryKey: ['calendarConnectorStatus'],
    queryFn: async () => {
      const res = await base44.functions.invoke('checkCalendarConnection', {});
      return res.data;
    },
    retry: false,
  });

  const isConnected = status?.connected === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronizza le scadenze delle rate sul tuo Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <CheckCircle className={`h-5 w-5 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                {isLoading ? 'Verifica connessione...' : isConnected ? 'Connesso' : 'Non connesso'}
              </p>
              <p className="text-xs text-slate-500">
                {isConnected
                  ? 'Google Calendar è operativo'
                  : 'Il connettore Google Calendar è gestito dall\'amministratore dell\'app'}
              </p>
            </div>
          </div>
          {isConnected && (
            <Badge className="bg-emerald-100 text-emerald-700">Attivo</Badge>
          )}
        </div>

        <div className="text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
          <p className="font-medium text-blue-800 flex items-center gap-1">
            <Info className="h-4 w-4" />
            Come funziona:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Quando aggiungi una rata, abilita "Sync Calendar"</li>
            <li>L'evento viene creato automaticamente con promemoria a 1 giorno e 2 ore</li>
            <li>Modifiche alla data o importo aggiornano l'evento sul calendario</li>
            <li>Al pagamento, l'evento viene aggiornato con "✅ PAGATO"</li>
            <li>Puoi rimuovere l'evento disabilitando il sync dalla rata</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}