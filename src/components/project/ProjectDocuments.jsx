import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, FileText, Image, Download, Trash2, File } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ProjectDocuments({ projectId }) {
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['projectDocuments', projectId],
    queryFn: () => base44.entities.ProjectDocument.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDocuments', projectId] });
      setDeleteDialogOpen(false);
      toast.success('Documento eliminato');
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Validate file type
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          toast.error(`Tipo file non valido: ${file.name}`);
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File troppo grande: ${file.name} (max 10MB)`);
          continue;
        }

        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Create document record
        await base44.entities.ProjectDocument.create({
          project_id: projectId,
          file_name: file.name,
          file_url,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: (await base44.auth.me()).email
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['projectDocuments', projectId] });
      toast.success(`${files.length} file caricato/i`);
      e.target.value = '';
    } catch (error) {
      toast.error('Caricamento fallito: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Documenti</CardTitle>
        <div>
          <input
            type="file"
            id={`file-upload-${projectId}`}
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.getElementById(`file-upload-${projectId}`).click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? 'Caricamento...' : 'Carica'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Caricamento...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Nessun documento caricato ancora</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-slate-600">
                    {getFileIcon(doc.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina Documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Sei sicuro di voler eliminare <strong>{selectedDoc?.file_name}</strong>? Questa azione non può essere annullata.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedDoc.id)}
              disabled={deleteMutation.isPending}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}