import React, { useMemo } from 'react';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, Plus, Layers } from 'lucide-react';

export default function WBSProjects() {
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: allWbs = [], isLoading: loadingWbs } = useQuery({
    queryKey: ['wbs-all'],
    queryFn: () => base44.entities.WBS.list(),
  });

  const projectsWithWbs = useMemo(() => {
    return projects.map(project => ({
      ...project,
      hasWbs: allWbs.some(wbs => wbs.project_id === project.id),
      wbsCount: allWbs.filter(wbs => wbs.project_id === project.id).length
    }));
  }, [projects, allWbs]);

  const statusColors = {
    planning: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    on_hold: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const handleProjectDoubleClick = (project) => {
    if (project.hasWbs) {
      window.location.href = createPageUrl(`WBS?projectId=${project.id}`);
    }
  };

  const handleCreateWbs = (project) => {
    window.location.href = createPageUrl(`WBS?projectId=${project.id}`);
  };

  if (loadingProjects || loadingWbs) {
    return (
      <div className="text-center py-12 text-slate-500">Caricamento...</div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="WBS - Gestione Progetti" 
        description="Accedi alla WBS dei progetti o creane una nuova"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsWithWbs.map(project => (
          <Card
            key={project.id}
            className="hover:shadow-lg transition-all cursor-pointer"
            onDoubleClick={() => handleProjectDoubleClick(project)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FolderKanban className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{project.name}</h3>
                    <p className="text-xs text-slate-500">{project.client_name || 'Nessun cliente'}</p>
                  </div>
                </div>
                <Badge className={statusColors[project.status || 'planning']}>
                  {(project.status || 'planning').replace('_', ' ')}
                </Badge>
              </div>

              {project.hasWbs ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Layers className="h-4 w-4" />
                    <span>{project.wbsCount} elementi WBS</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs text-emerald-700 font-medium">
                      Doppio click per aprire la WBS
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-xs text-slate-500 text-center">
                      Nessuna WBS assegnata
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCreateWbs(project)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crea WBS
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {projectsWithWbs.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Nessun progetto disponibile</p>
        </div>
      )}
    </div>
  );
}