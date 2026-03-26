import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileJson, FileSpreadsheet, FileText, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

const EXPORT_OPTIONS = [
  {
    id: 'json',
    label: 'JSON',
    description: 'Formato strutturato, ideale per backup e reimportazione',
    icon: FileJson,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    id: 'excel',
    label: 'Excel',
    description: 'Foglio di calcolo, ideale per analisi e condivisione',
    icon: FileSpreadsheet,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Documento stampabile, ideale per archivio e presentazione',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50',
  },
];

export default function DataExport() {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (format) => {
    setExporting(format);
    toast.info(`Esportazione ${format.toUpperCase()} in corso...`);

    try {
      const response = await base44.functions.invoke('exportAllData', { format });

      // response.data is the raw file content from the backend
      const data = response.data;
      let blob;
      let filename;

      if (format === 'json') {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
        filename = 'archfirm_export.json';
      } else if (format === 'excel') {
        // Backend returns TSV string
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        blob = new Blob([text], { type: 'text/tab-separated-values' });
        filename = 'archfirm_export.xls';
      } else if (format === 'pdf') {
        // Backend returns binary PDF — axios may return it as string or arraybuffer
        if (data instanceof ArrayBuffer || data instanceof Blob) {
          blob = new Blob([data], { type: 'application/pdf' });
        } else {
          // Convert binary string to array buffer
          const len = data.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = data.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'application/pdf' });
        }
        filename = 'archfirm_export.pdf';
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Esportazione ${format.toUpperCase()} completata!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'esportazione. Riprova.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Download className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle>Esporta Tutti i Dati</CardTitle>
            <CardDescription>
              Scarica un export completo di clienti, progetti, compensi, ricavi, spese, preventivi, rate, previsioni e altro
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isLoading = exporting === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={exporting !== null}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`p-3 rounded-lg ${option.color}`}>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{option.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-4">
          L'export include tutti i dati delle entità principali dell'applicazione.
        </p>
      </CardContent>
    </Card>
  );
}