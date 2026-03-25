import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertCircle, Loader2, Unlink } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleCalendarSettings() {
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['userCalendarToken'],
    queryFn: () => base44.entities.UserCalendarToken.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const token = tokens[0] || null;
  const isConnected = !!token;

  const disconnectMutation = useMutation({
    mutationFn: () => base44.entities.UserCalendarToken.delete(token.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCalendarToken'] });
      toast.success('Google Calendar disconnesso');
    },
    onError: () => toast.error('Errore durante la disconnessione'),
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await base44.functions.invoke('googleCalendarOAuthStart', {});
      const { auth_url } = result.data;
      if (auth_url) {
        window.location.href = auth_url;
      } else {
        toast.error('Impossibile avviare il flusso OAuth');
        setConnecting(false);
      }
    } catch (err) {
      toast.error('Errore: ' + err.message);
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Disconnettere Google Calendar? Gli eventi esistenti non verranno eliminati.')) {
      disconnectMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincronizza le scadenze delle rate sul tuo Google Calendar personale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div className="p-2 bg-slate-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-slate-900">
                {isConnected ? 'Connesso' : 'Non connesso'}
              </p>
              {isConnected && token.connected_at && (
                <p className="text-xs text-slate-500">
                  Connesso il {new Date(token.connected_at).toLocaleDateString('it-IT')}
                </p>
              )}
              {!isConnected && (
                <p className="text-xs text-slate-500">
                  Collega il tuo account Google per sincronizzare le rate
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Badge className="bg-emerald-100 text-emerald-700">Attivo</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnetti
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {connecting ? 'Reindirizzamento...' : 'Collega Google Calendar'}
              </Button>
            )}
          </div>
        </div>

        {isConnected && (
          <div className="text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
            <p className="font-medium text-blue-800">Come funziona:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Abilita "Sync Calendar" al momento di aggiungere una rata</li>
              <li>L'evento viene creato automaticamente con promemoria a 1 giorno</li>
              <li>Modifiche alla data o importo aggiornano l'evento</li>
              <li>Al pagamento, l'evento viene aggiornato con "PAGATO"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}