import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ProjectPhase, College, ActivityLog, CompetitionStatus, Project, Competition, Announcement } from '../types';
import { getDataForUser, getPendingUsers, approveUser, rejectUser, addCollege, getColleges, updateCollegeStatus, removeCollege, getAllUsers, getSystemLogs } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { 
  Clock, TrendingUp, AlertCircle, CheckCircle2, UserCheck, XCircle, 
  School, X, Loader2, Shield, Users, Trophy, Award,
  FileText, Activity, BarChart2, Power, Trash2, Building2, FolderKanban, ClipboardCheck, Globe, MapPin, Phone, UserCog, GraduationCap, Zap, ChevronRight, Plus, Rocket, BookOpen, Target, Calendar, Upload, ImageIcon, Key, Download, FileJson
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  
  // Data State
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // State for Admin/Management
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [showAddCollegeModal, setShowAddCollegeModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [newCollegeForm, setNewCollegeForm] = useState({ 
    name: '', emailId: '', website: '', address: '', contactPhone: '', customId: ''
  });
  const [collegeLogo, setCollegeLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Global Data State (for stats calculation)
  const [collegeList, setCollegeList] = useState<College[]>([]);
  const [allSystemUsers, setAllSystemUsers] = useState<User[]>([]);
  const [systemLogs, setSystemLogs] = useState<ActivityLog[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMsg, setModalMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // --- 1. DATA FETCHING & POLLING ---
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      const data = await getDataForUser(user.id, user.role);
      setCompetitions(data.competitions);
      setProjects(data.projects);
      setAnnouncements(data.announcements);

      if (user.role !== UserRole.STUDENT) {
        const users = await getAllUsers();
        setAllSystemUsers(users);
        if (user.role === UserRole.ADMIN) {
          setCollegeList(await getColleges());
          setSystemLogs(await getSystemLogs());
        }
      }
      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  // Poll for pending users (Optimized Interval)
  useEffect(() => {
    if (user.role !== UserRole.STUDENT) {
      const updatePending = async () => {
        try {
          const pending = await getPendingUsers(user);
          setPendingUsers(pending.filter(p => !processedIds.includes(p.id)));
          if (user.role === UserRole.ADMIN) setSystemLogs(await getSystemLogs());
        } catch (e) {
          console.error("Polling error", e);
        }
      };
      
      updatePending(); // Initial call
      const interval = setInterval(updatePending, 30000); // Increased interval to 30s
      return () => clearInterval(interval);
    }
  }, [user, processedIds]);

  // Handle Logo Preview
  useEffect(() => {
    if (collegeLogo) {
      const url = URL.createObjectURL(collegeLogo);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreview(null);
    }
  }, [collegeLogo]);

  // --- 2. MEMOIZED STATS ---
  // Student Stats
  const activeProjects = useMemo(() => projects.filter(p => p.phase !== ProjectPhase.IMPLEMENTATION), [projects]);
  const completedProjects = useMemo(() => projects.filter(p => p.phase === ProjectPhase.IMPLEMENTATION), [projects]);
  const ongoingCompetitions = useMemo(() => competitions.filter(c => c.status === CompetitionStatus.ONGOING), [competitions]);

  // Lecturer Stats
  const myStudents = useMemo(() => allSystemUsers.filter(u => u.role === UserRole.STUDENT && u.department === user.department && u.collegeId === user.collegeId), [allSystemUsers, user]);
  const myDeptProjects = useMemo(() => projects.filter(p => myStudents.some(s => s.id === p.studentId)), [projects, myStudents]);
  const pendingEvaluations = useMemo(() => myDeptProjects.filter(p => p.phase === ProjectPhase.TESTING || p.phase === ProjectPhase.IMPLEMENTATION), [myDeptProjects]);
  const chartDataLecturer = useMemo(() => [
     { name: 'Design', count: myDeptProjects.filter(p => p.phase === ProjectPhase.DESIGN).length },
     { name: 'Dev', count: myDeptProjects.filter(p => p.phase === ProjectPhase.DEVELOPMENT).length },
     { name: 'Test', count: myDeptProjects.filter(p => p.phase === ProjectPhase.TESTING).length },
     { name: 'Impl', count: myDeptProjects.filter(p => p.phase === ProjectPhase.IMPLEMENTATION).length },
  ], [myDeptProjects]);

  // HOD Stats
  const deptUsers = useMemo(() => allSystemUsers.filter(u => u.collegeId === user.collegeId && u.department === user.department), [allSystemUsers, user]);
  const deptStudents = useMemo(() => deptUsers.filter(u => u.role === UserRole.STUDENT), [deptUsers]);
  const lecturers = useMemo(() => deptUsers.filter(u => u.role === UserRole.LECTURER), [deptUsers]);
  const deptProjects = useMemo(() => {
     const studentIds = deptStudents.map(s => s.id);
     return projects.filter(p => studentIds.includes(p.studentId));
  }, [projects, deptStudents]);

  // Principal Stats
  const collegeUsers = useMemo(() => allSystemUsers.filter(u => u.collegeId === user.collegeId), [allSystemUsers, user]);
  const departments = useMemo(() => Array.from(new Set(collegeUsers.map(u => u.department).filter(Boolean))), [collegeUsers]);
  const chartDataDepartments = useMemo(() => departments.map(dept => ({
     name: dept,
     students: collegeUsers.filter(u => u.department === dept && u.role === UserRole.STUDENT).length
  })), [departments, collegeUsers]);

  // Admin Stats
  const activeCompetitionsCount = useMemo(() => competitions.filter(c => c.status === CompetitionStatus.ONGOING).length, [competitions]);


  // --- 3. ACTIONS ---
  const handleApprove = async (id: string) => {
    // Optimistic Update
    setPendingUsers(prev => prev.filter(u => u.id !== id));
    setProcessedIds(prev => [...prev, id]);
    // Update local state for all users too so stats reflect immediately
    setAllSystemUsers(prev => prev.map(u => u.id === id ? {...u, status: 'Active'} : u));

    // Background Async
    await approveUser(id);
  };

  const handleReject = async (id: string) => {
    if(window.confirm("Are you sure you want to reject this user?")) {
      setPendingUsers(prev => prev.filter(u => u.id !== id));
      setProcessedIds(prev => [...prev, id]);
      setAllSystemUsers(prev => prev.map(u => u.id === id ? {...u, status: 'Rejected'} : u));
      await rejectUser(id);
    }
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalMsg(null);
    try {
      await addCollege({ 
        name: newCollegeForm.name,
        emailId: newCollegeForm.emailId,
        website: newCollegeForm.website,
        address: newCollegeForm.address,
        contactPhone: newCollegeForm.contactPhone
      }, newCollegeForm.customId || undefined, collegeLogo || undefined);

      setModalMsg({ type: 'success', text: 'College added successfully.' });
      setNewCollegeForm({ name: '', emailId: '', website: '', address: '', contactPhone: '', customId: '' });
      setCollegeLogo(null);
      setCollegeList(await getColleges());
      setSystemLogs(await getSystemLogs());
      setTimeout(() => { setModalMsg(null); setShowAddCollegeModal(false); }, 1500);
    } catch (err: any) {
      setModalMsg({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const colleges = JSON.parse(content);
        if (!Array.isArray(colleges)) throw new Error("JSON must be an array of college objects.");

        setIsProcessing(true);
        let successCount = 0;
        for (const col of colleges) {
          try {
            await addCollege(col, col.id);
            successCount++;
          } catch (err) {
            console.error(`Failed to import ${col.name}`, err);
          }
        }
        
        alert(`Successfully imported ${successCount} out of ${colleges.length} colleges.`);
        setCollegeList(await getColleges());
      } catch (err: any) {
        alert("Import failed: " + err.message);
      } finally {
        setIsProcessing(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleToggleCollegeStatus = async (college: College) => {
    const newStatus = college.status === 'Active' ? 'Suspended' : 'Active';
    // Optimistic
    setCollegeList(prev => prev.map(c => c.id === college.id ? {...c, status: newStatus} : c));
    await updateCollegeStatus(college.id, newStatus);
  };

  const handleRemoveCollege = async (id: string) => {
    const linkedUsers = allSystemUsers.filter(u => u.collegeId === id);
    if (linkedUsers.length > 0) {
      alert(`Cannot delete college. ${linkedUsers.length} users are currently linked to this institution. Please remove or reassign them first.`);
      return;
    }

    if (window.confirm('Are you sure you want to permanently delete this college? This action cannot be undone.')) {
      try {
        setCollegeList(prev => prev.filter(c => c.id !== id));
        await removeCollege(id);
      } catch (e) {
        console.error("Failed to delete college", e);
        alert("An error occurred while deleting the college.");
      }
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // --- 4. RENDER HELPERS ---
  
  const StatCard = ({ title, value, icon: Icon, color, suffix, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all group h-full">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 flex items-center justify-center transition-colors`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {suffix && <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{suffix}</span>}
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
            {value.toLocaleString()} 
        </h3>
        <p className="text-slate-500 text-sm font-medium mt-1">{title}</p>
        {subtext && <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-50">{subtext}</p>}
      </div>
    </div>
  );

  const PendingApprovalsAlert = () => {
    if (pendingUsers.length === 0) return null;
    return (
      <div className="bg-white border-l-4 border-yellow-400 rounded-xl p-6 shadow-sm mb-6 animate-fade-in">
         <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><UserCheck size={24} /></div>
               <div>
                 <h3 className="font-bold text-slate-800 text-lg">Action Required</h3>
                 <p className="text-slate-500 text-sm">
                   You have <span className="font-bold text-yellow-600">{pendingUsers.length} pending approvals</span> awaiting review.
                 </p>
               </div>
            </div>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">High Priority</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             {pendingUsers.slice(0, 3).map(u => (
               <div key={u.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                   <img src={u.avatar} alt="" className="w-10 h-10 rounded-full bg-white" />
                   <div className="overflow-hidden">
                     <p className="font-bold text-slate-800 text-sm truncate">{u.name}</p>
                     <p className="text-xs text-slate-500 font-medium truncate">{u.role} • {u.department || 'General'}</p>
                   </div>
                 </div>
                 <div className="flex gap-2 mt-auto">
                   <button onClick={() => handleReject(u.id)} className="flex-1 py-1.5 bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold">Reject</button>
                   <button onClick={() => handleApprove(u.id)} className="flex-1 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold">Approve</button>
                 </div>
               </div>
             ))}
             {pendingUsers.length > 3 && (
               <div className="flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-400 text-sm font-medium">
                  +{pendingUsers.length - 3} more requests
               </div>
             )}
         </div>
      </div>
    );
  };

  const SectionHeader = ({ title, action }: {title: string, action?: React.ReactNode}) => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
        {title}
      </h2>
      {action}
    </div>
  );

  // --- 5. DASHBOARD VIEWS ---

  const renderStudentDashboard = () => (
      <div className="space-y-8 animate-fade-in">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white overflow-hidden shadow-xl shadow-blue-200">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
           
           <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                   <h1 className="text-3xl font-bold mb-2">Welcome back, {user.firstName}!</h1>
                   <p className="text-blue-100 max-w-lg text-lg">You have <span className="font-bold text-white">{activeProjects.length} active projects</span> and <span className="font-bold text-white">2 upcoming deadlines</span> this week.</p>
                </div>
                <div className="hidden md:block">
                   <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                      <Rocket size={32} className="text-white" />
                   </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                 <button onClick={() => navigate('/competitions')} className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2">
                    <Zap size={18} /> Find Competitions
                 </button>
                 <button onClick={() => navigate('/projects')} className="px-6 py-3 bg-blue-500/30 backdrop-blur-sm text-white border border-white/20 font-bold rounded-xl hover:bg-blue-500/40 transition-colors flex items-center gap-2">
                    <FolderKanban size={18} /> View My Board
                 </button>
              </div>
           </div>
        </div>

        {/* Stats & Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-300 transition-colors cursor-pointer" onClick={() => navigate('/projects')}>
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><Activity size={20} /></div>
              <span className="text-2xl font-bold text-slate-800">{activeProjects.length}</span>
              <span className="text-xs text-slate-500 font-medium">Active Projects</span>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-green-300 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2"><Trophy size={20} /></div>
              <span className="text-2xl font-bold text-slate-800">{ongoingCompetitions.length}</span>
              <span className="text-xs text-slate-500 font-medium">Live Events</span>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-purple-300 transition-colors cursor-pointer" onClick={() => navigate('/teams')}>
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2"><Users size={20} /></div>
              <span className="text-2xl font-bold text-slate-800">Teams</span>
              <span className="text-xs text-slate-500 font-medium">Manage Teams</span>
           </div>
           <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-orange-300 transition-colors cursor-pointer" onClick={() => navigate('/profile')}>
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={20} /></div>
              <span className="text-2xl font-bold text-slate-800">{completedProjects.length}</span>
              <span className="text-xs text-slate-500 font-medium">Completed</span>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Active Projects List */}
           <div className="lg:col-span-2">
              <SectionHeader title="Current Projects" action={<button onClick={() => navigate('/projects')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>} />
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {activeProjects.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {activeProjects.map(p => (
                      <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400">
                               {p.title.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                               <h4 className="font-bold text-slate-800">{p.title}</h4>
                               <p className="text-xs text-slate-500">{p.teamName}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-1">{p.phase}</span>
                            <p className="text-[10px] text-slate-400">Updated {new Date(p.lastUpdated).toLocaleDateString()}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <FolderKanban size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">No active projects</p>
                    <button onClick={() => navigate('/competitions')} className="mt-2 text-sm text-blue-600 font-bold">Start a project</button>
                  </div>
                )}
              </div>
           </div>

           {/* Recommended Competitions */}
           <div>
              <SectionHeader title="Explore Events" />
              <div className="space-y-4">
                 {competitions.slice(0, 3).map(c => (
                   <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/competitions')}>
                      <div className="flex items-center gap-3 mb-3">
                         <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Trophy size={18} /></div>
                         <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-slate-800 text-sm truncate">{c.title}</h4>
                           <p className="text-xs text-slate-500">{c.date}</p>
                         </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                         <span className={`px-2 py-0.5 rounded-full font-bold ${c.status === 'Ongoing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{c.status}</span>
                         <span className="text-slate-400">{c.participants} Participants</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
  );

  const renderLecturerDashboard = () => (
      <div className="space-y-8 animate-fade-in">
         <div className="flex items-center justify-between">
           <div>
              <h1 className="text-2xl font-bold text-slate-900">Lecturer Overview</h1>
              <p className="text-slate-500">Department of {user.department}</p>
           </div>
           <button onClick={() => setShowAnalyticsModal(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2">
              <Activity size={18} /> Class Analytics
           </button>
         </div>

         <PendingApprovalsAlert />

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Students" value={myStudents.length} icon={GraduationCap} color="bg-blue-600" suffix="Assigned" />
            <StatCard title="Active Projects" value={myDeptProjects.length} icon={FolderKanban} color="bg-indigo-600" />
            <StatCard title="Pending Review" value={pendingEvaluations.length} icon={ClipboardCheck} color="bg-orange-500" subtext="Projects in Testing/Implementation" />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Needs Attention */}
            <div>
               <SectionHeader title="Projects Needing Review" />
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {pendingEvaluations.length > 0 ? (
                     <div className="divide-y divide-slate-100">
                        {pendingEvaluations.map(p => (
                           <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                              <div>
                                 <h4 className="font-bold text-slate-800 text-sm">{p.title}</h4>
                                 <p className="text-xs text-slate-500">{p.teamName}</p>
                              </div>
                              <button onClick={() => navigate('/projects')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                                 Evaluate
                              </button>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="p-8 text-center text-slate-400 text-sm">No pending evaluations.</div>
                  )}
               </div>
            </div>

            {/* Student Progress Chart */}
            <div>
               <SectionHeader title="Phase Distribution" />
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartDataLecturer}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 4, 4]} barSize={40} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      </div>
  );

  const renderHODDashboard = () => (
       <div className="space-y-8 animate-fade-in">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
             <div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">Head of Department</span>
                <h1 className="text-3xl font-bold text-slate-900">{user.department}</h1>
                <p className="text-slate-500 mt-1">Manage faculty, curriculum, and student performance.</p>
             </div>
             <div className="flex gap-3">
                <button onClick={() => setShowAnalyticsModal(true)} className="px-5 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2">
                   <BarChart2 size={18} /> Department Reports
                </button>
             </div>
          </div>

          <PendingApprovalsAlert />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <StatCard title="Faculty Members" value={lecturers.length} icon={UserCog} color="bg-purple-600" />
             <StatCard title="Total Students" value={deptStudents.length} icon={GraduationCap} color="bg-blue-600" />
             <StatCard title="Active Projects" value={deptProjects.length} icon={FolderKanban} color="bg-indigo-600" />
             <StatCard title="Avg Project Score" value="82" icon={Target} color="bg-green-600" suffix="/ 100" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2">
                <SectionHeader title="Department Activity" />
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-80">
                   {/* Mock Activity Chart */}
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                         { name: 'Week 1', projects: 4, submissions: 10 },
                         { name: 'Week 2', projects: 7, submissions: 15 },
                         { name: 'Week 3', projects: 12, submissions: 8 },
                         { name: 'Week 4', projects: 18, submissions: 25 },
                      ]}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} />
                         <YAxis axisLine={false} tickLine={false} />
                         <Tooltip />
                         <Legend />
                         <Line type="monotone" dataKey="projects" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} />
                         <Line type="monotone" dataKey="submissions" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div>
                <SectionHeader title="Recent Announcements" action={<button className="text-blue-600 text-xs font-bold"><Plus size={14} /></button>} />
                <div className="space-y-4">
                   {announcements.filter(a => a.targetRole === 'All' || a.targetRole === UserRole.HOD || a.targetRole === UserRole.LECTURER).slice(0, 3).map(a => (
                      <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{a.date}</span>
                         <h4 className="font-bold text-slate-800 text-sm mt-1">{a.title}</h4>
                         <p className="text-xs text-slate-500 mt-2 line-clamp-2">{a.content}</p>
                      </div>
                   ))}
                   {announcements.length === 0 && <p className="text-slate-400 text-sm">No announcements.</p>}
                </div>
             </div>
          </div>
       </div>
  );

  const renderPrincipalDashboard = () => (
       <div className="space-y-8 animate-fade-in">
          <div className="flex justify-between items-end mb-2">
             <div>
                <h1 className="text-3xl font-bold text-slate-900">Institution Dashboard</h1>
                <p className="text-slate-500 mt-1">{collegeList.find(c => c.id === user.collegeId)?.name || 'Campus Overview'}</p>
             </div>
             <div className="flex gap-2">
                <button className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"><Calendar size={20} /></button>
                <button className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50"><FileText size={20} /></button>
             </div>
          </div>

          <PendingApprovalsAlert />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <StatCard title="Active Departments" value={departments.length} icon={Building2} color="bg-blue-600" />
             <StatCard title="Total Students" value={collegeUsers.filter(u => u.role === UserRole.STUDENT).length} icon={Users} color="bg-indigo-600" />
             <StatCard title="Ongoing Competitions" value={ongoingCompetitions.length} icon={Trophy} color="bg-orange-500" />
             <StatCard title="Research Output" value="High" icon={BookOpen} color="bg-green-600" suffix="Top 10%" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div>
                <SectionHeader title="Department Enrollment" />
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-80">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataDepartments} layout="vertical">
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                         <Tooltip cursor={{fill: '#f8fafc'}} />
                         <Bar dataKey="students" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div>
                <SectionHeader title="Competition Participation" />
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-80 flex items-center justify-center">
                    {/* Mock Pie Chart */}
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={[
                             { name: 'Hackathons', value: 45, fill: '#3b82f6' },
                             { name: 'Research', value: 25, fill: '#8b5cf6' },
                             { name: 'Robotics', value: 15, fill: '#10b981' },
                             { name: 'Debate', value: 15, fill: '#f59e0b' },
                          ]} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                             <Cell fill="#3b82f6" />
                             <Cell fill="#8b5cf6" />
                             <Cell fill="#10b981" />
                             <Cell fill="#f59e0b" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                       </PieChart>
                    </ResponsiveContainer>
                </div>
             </div>
          </div>
       </div>
  );

  const renderAdminDashboard = () => (
      <div className="space-y-6 animate-fade-in relative pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-white shadow-lg shadow-red-200">
          <div className="flex items-start gap-4">
             <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Shield size={32} />
             </div>
             <div>
               <h1 className="text-2xl font-bold">Administrator Dashboard</h1>
               <p className="text-red-100 opacity-90 mt-1">System control center</p>
             </div>
          </div>
        </div>

        <PendingApprovalsAlert />

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard title="Total Users" value={allSystemUsers.length} icon={Users} color="bg-blue-600" />
           <StatCard title="Active Competitions" value={activeCompetitionsCount} icon={Award} color="bg-purple-600" />
           <StatCard title="Total Projects" value={projects.length} icon={FileText} color="bg-green-600" />
           <StatCard title="System Health" value="98%" icon={Activity} color="bg-orange-500" />
        </div>

        {/* Actions Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
           <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => setShowAddCollegeModal(true)} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all group">
                 <School size={24} className="text-slate-400 group-hover:text-blue-600" />
                 <span className="font-semibold text-sm">Add College</span>
              </button>
              <div className="relative flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all group cursor-pointer overflow-hidden">
                 <input 
                    type="file" 
                    accept=".json"
                    onChange={handleBulkImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                 />
                 <FileJson size={24} className="text-slate-400 group-hover:text-green-600" />
                 <span className="font-semibold text-sm">Bulk Import</span>
              </div>
              <button onClick={() => setShowAnalyticsModal(true)} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all group">
                 <BarChart2 size={24} className="text-slate-400 group-hover:text-purple-600" />
                 <span className="font-semibold text-sm">Analytics</span>
              </button>
           </div>
        </div>

        {/* College List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">Registered Institutions</h3>
              <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">{collegeList.length} Total</span>
           </div>
           <div className="grid grid-cols-1 gap-3">
              {collegeList.map(college => (
                <div key={college.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden ${college.status === 'Active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            {college.logoUrl ? (
                              <img src={college.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 size={20} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800">{college.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${college.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {college.status}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1" title="Document ID">
                                <Key size={12} className="text-slate-400"/> {college.id}
                              </span>
                              <span className="flex items-center gap-1" title="Domain ID">
                                <Shield size={12} className="text-slate-400"/> {college.emailId}
                              </span>
                              {college.website && (
                                <a href={college.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 hover:underline">
                                  <Globe size={12} className="text-slate-400"/> Website
                                </a>
                              )}
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400"/> {college.address ? (college.address.split(',')[1] || college.address) : 'Main Campus'}
                              </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button 
                          onClick={() => handleToggleCollegeStatus(college)} 
                          title={college.status === 'Active' ? "Suspend College" : "Activate College"}
                          className={`p-2 rounded-lg border transition-all ${college.status === 'Active' ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600 border-transparent hover:border-amber-200' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'}`}
                        >
                          <Power size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveCollege(college.id)} 
                          title="Delete College"
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                </div>
              ))}
           </div>
        </div>
      </div>
  );

  // Helper to switch based on role
  const renderDashboard = () => {
    switch (user.role) {
      case UserRole.STUDENT:
        return renderStudentDashboard();
      case UserRole.LECTURER:
        return renderLecturerDashboard();
      case UserRole.HOD:
        return renderHODDashboard();
      case UserRole.PRINCIPAL:
        return renderPrincipalDashboard();
      case UserRole.ADMIN:
        return renderAdminDashboard();
      default:
        return <div className="p-8 text-center text-slate-500">Access Restricted</div>;
    }
  };

  return (
    <div className="pb-20">
       {renderDashboard()}

       {/* MODALS */}
       {showAddCollegeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Add College</h3>
                <button onClick={() => setShowAddCollegeModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCollege} className="space-y-4">
                {modalMsg && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${modalMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                     <AlertCircle size={16} />
                     <span>{modalMsg.text}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Institution Name <span className="text-red-500">*</span></label>
                    <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Campus Complete Demo Univ"
                        value={newCollegeForm.name} onChange={(e) => setNewCollegeForm({...newCollegeForm, name: e.target.value})} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Custom Document ID (Optional)</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="text" className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                          placeholder="e.g. kWE1Ir8wlBnv31BdZyDQ"
                          value={newCollegeForm.customId} onChange={(e) => setNewCollegeForm({...newCollegeForm, customId: e.target.value})} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Leave blank for auto-generated ID.</p>
                  </div>
                  
                  {/* File Upload for Logo with Preview */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">College Logo (Optional)</label>
                    <div className="flex items-start gap-4">
                       {/* Preview Area */}
                       {logoPreview ? (
                         <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-white group shrink-0">
                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                            <button 
                               type="button"
                               onClick={() => { setCollegeLogo(null); setLogoPreview(null); }}
                               className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                            >
                               <X size={20} />
                            </button>
                         </div>
                       ) : (
                         <div className="w-24 h-24 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-300 shrink-0">
                            <ImageIcon size={24} />
                         </div>
                       )}

                       {/* Input Area */}
                       <div className="flex-1">
                          <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors p-4 flex flex-col items-center justify-center cursor-pointer h-24">
                             <input 
                               type="file" 
                               accept="image/*" 
                               onChange={(e) => e.target.files && setCollegeLogo(e.target.files[0])}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             />
                             <Upload size={20} className="text-slate-400 mb-1" />
                             <p className="text-xs text-slate-500">Click to upload logo</p>
                          </div>
                          {collegeLogo && (
                             <p className="text-xs text-green-600 mt-2 flex items-center gap-1 font-medium">
                                <CheckCircle2 size={12} /> {collegeLogo.name}
                             </p>
                          )}
                       </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Domain (@)</label>
                    <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="campus.edu" value={newCollegeForm.emailId} onChange={(e) => setNewCollegeForm({...newCollegeForm, emailId: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="tel" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="555-0199" value={newCollegeForm.contactPhone} onChange={(e) => setNewCollegeForm({...newCollegeForm, contactPhone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input type="url" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="https://demo.campus.edu" value={newCollegeForm.website} onChange={(e) => setNewCollegeForm({...newCollegeForm, website: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address / Location</label>
                    <input type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="123 Innovation Drive, Tech City" value={newCollegeForm.address} onChange={(e) => setNewCollegeForm({...newCollegeForm, address: e.target.value})} />
                  </div>
                  
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isProcessing} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="animate-spin" /> : 'Register College'}
                  </button>
                </div>
              </form>
            </div>
          </div>
       )}

       {showAnalyticsModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">
                 <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center rounded-t-3xl">
                    <h2 className="text-xl font-bold text-slate-900">System Analytics</h2>
                    <button onClick={() => setShowAnalyticsModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                 </div>
                 <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="font-bold text-slate-800 mb-6">User Role Distribution</h3>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie 
                                   data={[
                                      { name: 'Students', value: allSystemUsers.filter(u => u.role === UserRole.STUDENT).length, fill: '#f97316' },
                                      { name: 'Lecturers', value: allSystemUsers.filter(u => u.role === UserRole.LECTURER).length, fill: '#22c55e' },
                                      { name: 'HODs', value: allSystemUsers.filter(u => u.role === UserRole.HOD).length, fill: '#a855f7' },
                                      { name: 'Principals', value: allSystemUsers.filter(u => u.role === UserRole.PRINCIPAL).length, fill: '#eab308' },
                                   ]} 
                                   innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                >
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                             </PieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    {/* Placeholder for more specific charts based on role */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
                       <p className="text-slate-400">Detailed performance metrics coming soon.</p>
                    </div>
                 </div>
              </div>
           </div>
       )}
    </div>
  );
};