import React, { useState, useEffect } from 'react';
import { getDataForUser, getUserTeams, createProject } from '../services/dataService';
import { User, CompetitionStatus, UserRole, Team, Competition } from '../types';
import { STATUS_COLORS } from '../constants';
import { Calendar, Users, ArrowRight, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Competitions: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    teamId: ''
  });

  useEffect(() => {
    const fetchCompetitions = async () => {
      setLoading(true);
      const data = await getDataForUser(user.id, user.role);
      setCompetitions(data.competitions);
      setLoading(false);
    };
    fetchCompetitions();
  }, [user]);

  const handleOpenRegister = async (compId: string) => {
    // 1. Fetch user teams async
    const teams = await getUserTeams(user.id);
    
    // 2. Check if user belongs to any team (required for project creation)
    if (teams.length === 0) {
      alert("You need to create or join a Team first before registering a project.");
      navigate('/teams');
      return;
    }

    setUserTeams(teams);
    setSelectedCompetitionId(compId);
    // Auto-select first team if only one exists
    setFormData({
      title: '',
      description: '',
      teamId: teams.length === 1 ? teams[0].id : ''
    });
    setModalError(null);
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitionId || !formData.teamId) return;
    
    setIsSubmitting(true);
    setModalError(null);

    try {
      await createProject(
        { 
          title: formData.title, 
          description: formData.description, 
          competitionId: selectedCompetitionId 
        },
        formData.teamId,
        user
      );
      
      // Success
      setShowRegisterModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      // Reset form
      setFormData({ title: '', description: '', teamId: '' });

    } catch (err: any) {
      setModalError(err.message || 'Failed to register project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 relative">
       {/* Success Toast */}
       {showSuccessToast && (
         <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in-up">
           <CheckCircle2 size={24} />
           <div>
             <h4 className="font-bold">Registration Successful!</h4>
             <p className="text-sm text-green-100">Your project has been registered.</p>
           </div>
           <button onClick={() => setShowSuccessToast(false)} className="ml-2 hover:bg-green-600 rounded-full p-1">
             <X size={16} />
           </button>
         </div>
       )}

       <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Competitions</h1>
            <p className="text-slate-500">Discover and manage academic challenges</p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {competitions.map((comp) => (
           <div key={comp.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 group hover:shadow-md transition-shadow flex flex-col">
             <div className="h-32 bg-slate-200 relative">
               <img src={comp.bannerUrl} alt={comp.title} className="w-full h-full object-cover" />
               <div className="absolute top-3 right-3">
                 <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${STATUS_COLORS[comp.status]}`}>
                   {comp.status}
                 </span>
               </div>
             </div>
             <div className="p-5 flex-1 flex flex-col">
               <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{comp.title}</h3>
               <p className="text-sm text-slate-500 line-clamp-2 mb-4">{comp.description}</p>
               
               <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>{comp.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{comp.participants} Joined</span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  {user.role === UserRole.STUDENT && (comp.status === CompetitionStatus.UPCOMING || comp.status === CompetitionStatus.ONGOING) ? (
                     <button 
                       onClick={() => handleOpenRegister(comp.id)}
                       className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
                     >
                       Register Project
                       <ArrowRight size={14} />
                     </button>
                  ) : (
                    <button className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                      View Details
                      <ArrowRight size={14} />
                    </button>
                  )}
               </div>
             </div>
           </div>
         ))}
       </div>

       {/* Register Project Modal */}
       {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Register Project</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
               {modalError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                     <AlertCircle size={16} />
                     <span>{modalError}</span>
                  </div>
               )}

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                 <input 
                   type="text" required
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                   placeholder="e.g. AI-Driven Waste Management"
                   value={formData.title}
                   onChange={(e) => setFormData({...formData, title: e.target.value})}
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                 <textarea 
                   required
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                   rows={3}
                   placeholder="Briefly describe your solution..."
                   value={formData.description}
                   onChange={(e) => setFormData({...formData, description: e.target.value})}
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Select Team</label>
                 <select 
                   required
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                   value={formData.teamId}
                   onChange={(e) => setFormData({...formData, teamId: e.target.value})}
                 >
                   <option value="">Choose a team...</option>
                   {userTeams.map(t => (
                     <option key={t.id} value={t.id}>{t.name}</option>
                   ))}
                 </select>
                 <p className="text-xs text-slate-400 mt-1">
                    Only teams you belong to are listed. The project will be linked to this team.
                 </p>
               </div>

               <button 
                 type="submit" 
                 disabled={isSubmitting || !formData.title || !formData.teamId}
                 className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2 mt-2"
               >
                 {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Registration'}
               </button>
            </form>
          </div>
        </div>
       )}
    </div>
  );
};