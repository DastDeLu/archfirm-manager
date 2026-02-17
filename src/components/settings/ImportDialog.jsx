import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileUp, CheckCircle2, XCircle, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ImportDialog({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const resetDialog = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setErrorMessage('');
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Formato file non valido. Usa .xlsx, .xls o .csv');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      // Step 1: Upload file (30% progress)
      setStatus('uploading');
      setProgress(10);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProgress(30);

      // Step 2: Process file (70% progress)
      setStatus('processing');
      setProgress(40);

      const response = await base44.functions.invoke('importFinancialData', { file_url });
      setProgress(80);

      if (response.data.success) {
        setProgress(100);
        setStatus('success');
        setResults(response.data.imported);

        const summary = [];
        if (response.data.imported.revenues > 0) summary.push(`${response.data.imported.revenues} ricavi`);
        if (response.data.imported.expenses > 0) summary.push(`${response.data.imported.expenses} spese`);
        if (response.data.imported.clients > 0) summary.push(`${response.data.imported.clients} clienti`);
        if (response.data.imported.projects > 0) summary.push(`${response.data.imported.projects} progetti`);
        if (response.data.imported.chapters > 0) summary.push(`${response.data.imported.chapters} capitoli`);

        toast.success(`Importati: ${summary.join(', ')}`);

        if (response.data.errors && response.data.errors.length > 0) {
          toast.warning(`${response.data.errors.length} operazioni fallite`);
        }

        queryClient.invalidateQueries();
      } else {
        setStatus('error');
        setErrorMessage(response.data.error || 'Importazione fallita');
        toast.error(response.data.error || 'Importazione fallita');
      }
    } catch (error) {
      setStatus('error');
      setProgress(0);
      setErrorMessage(error.message || 'Errore durante l\'importazione');
      toast.error('Errore durante l\'importazione');
      console.error('Import error:', error);
    }
  };

  const handleClose = () => {
    if (status === 'uploading' || status === 'processing') {
      toast.warning('Attendere il completamento dell\'importazione');
      return;
    }
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importa Dati Finanziari</DialogTitle>
          <DialogDescription>
            Carica un file Excel o CSV per importare ricavi, spese, clienti e progetti
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Selection */}
          {status === 'idle' && !file && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                Clicca per selezionare un file
              </p>
              <p className="text-xs text-slate-500">
                Formati supportati: .xlsx, .xls, .csv
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="mt-4"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Seleziona File
              </Button>
            </div>
          )}

          {/* File Selected */}
          {file && status === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Nota:</strong> L'AI analizzerà automaticamente il file e mapperà i dati alle entità corrette.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleImport} className="flex-1">
                  Avvia Importazione
                </Button>
                <Button onClick={resetDialog} variant="outline">
                  Cambia File
                </Button>
              </div>
            </div>
          )}

          {/* Uploading State */}
          {status === 'uploading' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Caricamento file...</p>
                  <p className="text-xs text-slate-500">Upload in corso</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-slate-500">{progress}%</p>
            </div>
          )}

          {/* Processing State */}
          {status === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Elaborazione dati...</p>
                  <p className="text-xs text-blue-700">L'AI sta analizzando e importando i dati</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-slate-500">{progress}%</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-900">Importazione completata!</p>
                  <p className="text-xs text-emerald-700">Dati importati con successo</p>
                </div>
              </div>

              {results && (
                <div className="grid grid-cols-2 gap-3">
                  {results.revenues > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-900">{results.revenues}</p>
                      <p className="text-xs text-slate-500">Ricavi</p>
                    </div>
                  )}
                  {results.expenses > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-900">{results.expenses}</p>
                      <p className="text-xs text-slate-500">Spese</p>
                    </div>
                  )}
                  {results.clients > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-900">{results.clients}</p>
                      <p className="text-xs text-slate-500">Clienti</p>
                    </div>
                  )}
                  {results.projects > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-900">{results.projects}</p>
                      <p className="text-xs text-slate-500">Progetti</p>
                    </div>
                  )}
                  {results.chapters > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-900">{results.chapters}</p>
                      <p className="text-xs text-slate-500">Capitoli</p>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Chiudi
              </Button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Errore durante l'importazione</p>
                  <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetDialog} variant="outline" className="flex-1">
                  Riprova
                </Button>
                <Button onClick={handleClose} variant="outline">
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}