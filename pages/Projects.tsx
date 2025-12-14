import React, { useState, useEffect } from 'react';
import { User, ProjectPhase, Project } from '../types';
import { getDataForUser } from '../services/dataService';
import { PHASE_STEPS } from '../constants';
import { MoreHorizontal, Loader2 } from 'lucide-react';

export const Projects: React.FC<{ user: User }> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const data = await getDataForUser(user.id, user.role);
      setProjects(data.projects);
      setLoading(false);
    };
    fetchProjects();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Project Board</h1>
        <p className="text-slate-500">Track progress across development phases</p>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {PHASE_STEPS.map((phase) => {
            const phaseProjects = projects.filter(p => p.phase === phase);
            
            return (
              <div key={phase} className="flex-1 min-w-[280px] bg-slate-100/50 rounded-2xl p-4 flex flex-col h-full border border-slate-200/60">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="font-bold text-slate-700">{phase}</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {phaseProjects.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto no-scrollbar flex-1">
                  {phaseProjects.map((project) => (
                    <div 
                      key={project.id} 
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Score: {project.score}
                        </span>
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                      <h4 className="font-semibold text-slate-800 mb-1">{project.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{project.description}</p>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <span className="text-[10px] font-medium text-slate-400">{project.teamName}</span>
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {project.teamName.charAt(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {phaseProjects.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                      No projects
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};