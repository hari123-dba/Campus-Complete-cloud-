import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ProjectPhase, College, ActivityLog, CompetitionStatus } from '../types';
import { getDataForUser, getPendingUsers, approveUser, rejectUser, addCollege, getColleges, updateCollegeStatus, removeCollege, getAllUsers, getSystemLogs } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  Clock, TrendingUp, AlertCircle, CheckCircle2, UserCheck, XCircle, 
  School, X, Loader2, Shield, Users, Trophy, Award,
  FileText, Activity, BarChart2, Power, Trash2, Building2, FolderKanban, ClipboardCheck
} from 'lucide-react';

interface DashboardProps {
  user: User;
}

// Simple time helper
const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min ago";
  return Math.floor(seconds) + " sec ago";
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { competitions, projects, announcements } = getDataForUser(user.id, user.role);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  
  // Admin & Principal: Data States
  const [showAddCollegeModal, setShowAddCollegeModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  const [newCollegeForm, setNewCollegeForm] = useState({ name: '', emailId: '' });
  
  // Directory State
  const [collegeList, setCollegeList] = useState<College[]>([]);
  const [allSystemUsers, setAllSystemUsers] = useState<User[]>([]);
  const [systemLogs, setSystemLogs] = useState<ActivityLog[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMsg, setModalMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Initial Fetch for Admin and Principal
  useEffect(() => {
    if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) {
      // Principals need user data to count students/departments
      setAllSystemUsers(getAllUsers());
      
      if (user.role === UserRole.ADMIN) {
        setCollegeList(getColleges());
        setSystemLogs(getSystemLogs());
      }
    }
  }, [user.role, pendingUsers, processedIds]); 

  // Fetch pending users based on Role Hierarchy
  useEffect(() => {
    if (user.role !== UserRole.STUDENT) {
      const updatePending = () => {
        const pending = getPendingUsers(user);
        setPendingUsers(pending.filter(p => !processedIds.includes(p.id)));
        if (user.role === UserRole.ADMIN) setSystemLogs(getSystemLogs());
      };
      updatePending();
      const interval = setInterval(updatePending, 5000);
      return () => clearInterval(interval);
    }
  }, [user, processedIds]);

  const handleApprove = async (id: string) => {
    await approveUser(id);
    setProcessedIds(prev => [...prev, id]);
    if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) {
      setAllSystemUsers(getAllUsers());
      if (user.role === UserRole.ADMIN) setSystemLogs(getSystemLogs());
    }
  };

  const handleReject = async (id: string) => {
    if(window.confirm("Are you sure you want to reject this user?")) {
      await rejectUser(id);
      setProcessedIds(prev => [...prev, id]);
       if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) {
         setAllSystemUsers(getAllUsers());
         if (user.role === UserRole.ADMIN) setSystemLogs(getSystemLogs());
       }
    }
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalMsg(null);
    try {
      await addCollege(newCollegeForm.name, newCollegeForm.emailId);
      setModalMsg({ type: 'success', text: 'College added successfully.' });
      setNewCollegeForm({ name: '', emailId: '' });
      setCollegeList([...getColleges()]);
      setSystemLogs(getSystemLogs());
      setTimeout(() => {
        setModalMsg(null);
        setShowAddCollegeModal(false);
      }, 1500);
    } catch (err: any) {
      setModalMsg({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleCollegeStatus = async (college: College) => {
    const newStatus = college.status === 'Active' ? 'Suspended' : 'Active';
    await updateCollegeStatus(college.id, newStatus);
    setCollegeList([...getColleges()]);
    setSystemLogs(getSystemLogs());
  };

  const handleRemoveCollege = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this college? All associated users may lose access.')) {
      await removeCollege(id);
      setCollegeList([...getColleges()]);
      setSystemLogs(getSystemLogs());
    }
  };

  // --- ANALYTICS DATA PREPARATION ---
  const analyticsData = useMemo(() => {
    if (user.role !== UserRole.ADMIN) return null;

    // 1. Role Distribution
    const roleStats = [
      { name: 'Students', value: allSystemUsers.filter(u => u.role === UserRole.STUDENT).length, color: '#f97316' },
      { name: 'Lecturers', value: allSystemUsers.filter(u => u.role === UserRole.LECTURER).length, color: '#22c55e' },
      { name: 'HODs', value: allSystemUsers.filter(u => u.role === UserRole.HOD).length, color: '#a855f7' },
      { name: 'Principals', value: allSystemUsers.filter(u => u.role === UserRole.PRINCIPAL).length, color: '#eab308' },
      { name: 'Admins', value: allSystemUsers.filter(u => u.role === UserRole.ADMIN).length, color: '#ef4444' },
    ].filter(i => i.value > 0);

    // 2. Project Phases
    const projectPhaseStats = [
      { name: 'Design', value: projects.filter(p => p.phase === ProjectPhase.DESIGN).length },
      { name: 'Dev', value: projects.filter(p => p.phase === ProjectPhase.DEVELOPMENT).length },
      { name: 'Test', value: projects.filter(p => p.phase === ProjectPhase.TESTING).length },
      { name: 'Deploy', value: projects.filter(p => p.phase === ProjectPhase.IMPLEMENTATION).length },
    ];

    // 3. College Activity (Top 5 by User Count)
    const collegeStats = collegeList.map(c => ({
      name: c.name,
      users: allSystemUsers.filter(u => u.collegeId === c.id).length
    })).sort((a, b) => b.users - a.users).slice(0, 5);

    // 4. System Health (Logs)
    const logStats = [
      { name: 'Healthy', value: systemLogs.filter(l => l.type === 'success' || l.type === 'info').length, color: '#22c55e' },
      { name: 'Issues', value: systemLogs.filter(l => l.type === 'error' || l.type === 'critical').length, color: '#ef4444' },
      { name: 'Warnings', value: systemLogs.filter(l => l.type === 'warning').length, color: '#eab308' },
    ].filter(i => i.value > 0);

    return { roleStats, projectPhaseStats, collegeStats, logStats };
  }, [allSystemUsers, projects, collegeList, systemLogs, user.role]);

  // Principal Stats Calculation
  const principalStats = useMemo(() => {
    if (user.role !== UserRole.PRINCIPAL) return null;
    const collegeUsers = allSystemUsers.filter(u => u.collegeId === user.collegeId);
    
    // Count unique departments
    const uniqueDepts = new Set(collegeUsers.map(u => u.department).filter(Boolean)).size;
    const totalStudents = collegeUsers.filter(u => u.role === UserRole.STUDENT).length;

    return {
      departments: uniqueDepts,
      students: totalStudents,
    };
  }, [allSystemUsers, user.role, user.collegeId]);

  const activeCompetitions = competitions.filter(c => c.status === CompetitionStatus.ONGOING).length;
  const pendingProjects = projects.filter(p => p.phase !== ProjectPhase.IMPLEMENTATION).length;
  
  const StatCard = ({ title, value, icon: Icon, color, trend, trendLabel }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div>
        <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center mb-4`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      {trend && (
         <div className="flex items-center self-end mb-1">
             <span className="text-green-500 text-xs font-bold">{trend}</span>
         </div>
      )}
      {trendLabel && (
        <span className="text-green-500 text-sm font-medium self-end">{trendLabel}</span>
      )}
    </div>
  );

  if (user.role === UserRole.ADMIN) {
    const totalUsers = allSystemUsers.length;
    const studentCount = allSystemUsers.filter(u => u.role === UserRole.STUDENT).length;
    const lecturerCount = allSystemUsers.filter(u => u.role === UserRole.LECTURER).length;
    const hodCount = allSystemUsers.filter(u => u.role === UserRole.HOD).length;
    const principalCount = allSystemUsers.filter(u => u.role === UserRole.PRINCIPAL).length;
    const getPercent = (count: number) => totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;

    return (
      <div className="space-y-6 animate-fade-in relative pb-20">
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-white shadow-lg shadow-red-200">
          <div className="flex items-start gap-4">
             <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Shield size={32} />
             </div>
             <div>
               <h1 className="text-2xl font-bold">Administrator Dashboard</h1>
               <p className="text-red-100 opacity-90 mt-1">Complete system control and management</p>
             </div>
          </div>
        </div>

        {pendingUsers.length > 0 && (
          <div className="bg-white border border-yellow-200 bg-yellow-50/50 rounded-2xl p-6 shadow-sm animate-fade-in">
             <div className="flex items-center gap-2 mb-4">
               <div className="relative">
                  <UserCheck className="text-yellow-600" size={24} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
               </div>
               <div>
                 <h3 className="font-bold text-lg text-slate-800">Pending Approvals</h3>
                 <p className="text-xs text-slate-500">Review Principal registrations.</p>
               </div>
               <span className="ml-auto bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {pendingUsers.map(u => (
                 <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <img src={u.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-100" />
                     <div>
                       <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                       <p className="text-xs text-slate-500">{u.role} • {u.email}</p>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleReject(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><X size={16} /></button>
                     <button onClick={() => handleApprove(u.id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><CheckCircle2 size={16} /></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard title="Total Users" value={totalUsers.toLocaleString()} icon={Users} color="bg-blue-600" trend="+12%" />
           <StatCard title="Active Competitions" value={activeCompetitions} icon={Award} color="bg-purple-600" trend="+3" />
           <StatCard title="Total Projects" value={projects.length} icon={FileText} color="bg-green-600" trend="+28%" />
           <StatCard title="System Health" value="98%" icon={Activity} color="bg-orange-500" trendLabel="Good" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
           <h3 className="font-medium text-slate-800 mb-4">Admin Actions</h3>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-xl font-semibold hover:bg-purple-100 transition-colors">
                 <Trophy size={20} /> Competitions
              </button>
              <button onClick={() => setShowAddCollegeModal(true)} className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-orange-700 rounded-xl font-semibold hover:bg-orange-100 transition-colors">
                 <School size={20} /> Add College
              </button>
              <button onClick={() => setShowAnalyticsModal(true)} className="flex items-center justify-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl font-semibold hover:bg-green-100 transition-colors">
                 <BarChart2 size={20} /> Analytics
              </button>
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-medium text-slate-800">Registered Institutions</h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">{collegeList.length} Total</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collegeList.map(college => (
                <div key={college.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 text-sm">{college.name}</p>
                            <p className="text-xs text-slate-500">@{college.emailId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${college.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {college.status}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => handleToggleCollegeStatus(college)} className="p-1.5 hover:bg-slate-200 rounded text-slate-500" title="Toggle Status">
                            <Power size={14} />
                          </button>
                          <button onClick={() => handleRemoveCollege(college.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500" title="Delete College">
                            <Trash2 size={14} />
                          </button>
                        </div>
                    </div>
                </div>
              ))}
           </div>
        </div>

        {/* ... (Existing Analytics Graph Code for Admin) ... */}
        
        {/* Analytics Modal */}
        {showAnalyticsModal && analyticsData && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">
                 
                 {/* Header */}
                 <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center rounded-t-3xl">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-green-100 text-green-700 rounded-xl">
                          <BarChart2 size={24} />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">System Analytics</h2>
                          <p className="text-sm text-slate-500">Real-time data insights & metrics</p>
                       </div>
                    </div>
                    <button onClick={() => setShowAnalyticsModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                       <X size={24} className="text-slate-400" />
                    </button>
                 </div>

                 {/* Content */}
                 <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* User Distribution */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Users size={18} className="text-blue-500" /> User Role Distribution
                       </h3>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie 
                                   data={analyticsData.roleStats} 
                                   innerRadius={60} 
                                   outerRadius={80} 
                                   paddingAngle={5} 
                                   dataKey="value"
                                >
                                   {analyticsData.roleStats.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                   ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                             </PieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* Project Pipeline */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <FolderKanban size={18} className="text-orange-500" /> Project Pipeline
                       </h3>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={analyticsData.projectPhaseStats} layout="vertical" margin={{left: 20}}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border:'none'}} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 <div className="p-6 bg-slate-50 rounded-b-3xl border-t border-slate-200 flex justify-end">
                    <button onClick={() => setShowAnalyticsModal(false)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-colors">
                       Close Report
                    </button>
                 </div>
              </div>
           </div>
        )}

        {showAddCollegeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Add College</h3>
                <button onClick={() => setShowAddCollegeModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCollege}>
                {modalMsg && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${modalMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                     <AlertCircle size={16} />
                     <span>{modalMsg.text}</span>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">College Name</label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input type="text" required className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Springfield Institute of Technology"
                      value={newCollegeForm.name} onChange={(e) => setNewCollegeForm({...newCollegeForm, name: e.target.value})} />
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Domain</label>
                  <p className="text-xs text-slate-400 mb-2">Used to identify users belonging to this college.</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                    <input type="text" required className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="springfield.edu" value={newCollegeForm.emailId} onChange={(e) => setNewCollegeForm({...newCollegeForm, emailId: e.target.value})} />
                  </div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <><School size={18} /> Register College</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.firstName}!</h1>
          <p className="text-slate-500">Here's what's happening in your campus today.</p>
        </div>
      </div>

      {/* Unified Pending Approvals Alert (For all Approver Roles) */}
      {pendingUsers.length > 0 && (
        <div className="bg-white border border-yellow-200 bg-yellow-50/50 rounded-2xl p-6 shadow-sm animate-fade-in">
           <div className="flex items-center gap-2 mb-4">
             <div className="relative">
                <UserCheck className="text-yellow-600" size={24} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
             </div>
             <div>
               <h3 className="font-bold text-lg text-slate-800">Pending Approvals</h3>
               <p className="text-xs text-slate-500">
                 {user.role === UserRole.PRINCIPAL && "Review HOD registrations for your college."}
                 {user.role === UserRole.HOD && "Review Lecturer registrations for your department."}
                 {user.role === UserRole.LECTURER && "Review Student registrations."}
               </p>
             </div>
             <span className="ml-auto bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             {pendingUsers.map(u => (
               <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-3">
                     <img src={u.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-100" />
                     <div>
                       <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                       <p className="text-xs text-slate-500 font-medium">{u.role}</p>
                     </div>
                   </div>
                   <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">{u.uniqueId}</span>
                 </div>
                 
                 <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg space-y-1">
                   {(u.department) && <div><strong>Dept:</strong> {u.department}</div>}
                   {u.academicBackground && <div className="italic">"{u.academicBackground}"</div>}
                   {u.role === UserRole.STUDENT && <div>{u.academicYear}, Section {u.section}</div>}
                   <div className="text-[10px] text-slate-400 mt-1">{u.email}</div>
                 </div>

                 <div className="flex gap-2 mt-auto pt-2">
                   <button 
                     onClick={() => handleReject(u.id)}
                     className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                   >
                     <XCircle size={14} /> Reject
                   </button>
                   <button 
                     onClick={() => handleApprove(u.id)}
                     className="flex-1 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                   >
                     <CheckCircle2 size={14} /> Approve
                   </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Stats Grid: Specific Layout for Principal vs Others */}
      {user.role === UserRole.PRINCIPAL ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Departments */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-600/20">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Departments</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{principalStats?.departments}</h3>
          </div>

          {/* 2. Total Students */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
              <Users className="text-white w-6 h-6" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Students</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{principalStats?.students.toLocaleString()}</h3>
          </div>

          {/* 3. Active Competitions */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
              <Award className="text-white w-6 h-6" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Active Competitions</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeCompetitions}</h3>
          </div>

          {/* 4. Pending Approvals */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
              <ClipboardCheck className="text-white w-6 h-6" />
            </div>
            <p className="text-slate-500 text-sm font-medium">Pending Approvals</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingUsers.length}</h3>
          </div>
        </div>
      ) : (
        /* Generic Stats Grid for other roles */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Active Competitions</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeCompetitions}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-600 bg-opacity-10 flex items-center justify-center text-blue-600"><TrendingUp size={24}/></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">My Projects</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{projects.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500 bg-opacity-10 flex items-center justify-center text-orange-500"><Clock size={24}/></div>
          </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingProjects}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-500 bg-opacity-10 flex items-center justify-center text-yellow-500"><AlertCircle size={24}/></div>
          </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{projects.length - pendingProjects}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500 bg-opacity-10 flex items-center justify-center text-green-500"><CheckCircle2 size={24}/></div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Project Progress Overview</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projects}>
                  <XAxis dataKey="title" tick={{fontSize: 12}} interval={0} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {projects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#22c55e' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Recent Projects</h3>
                <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
             </div>
             <div className="divide-y divide-slate-100">
               {projects.map(project => (
                 <div key={project.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                   <div className="flex items-start gap-3">
                     <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                       {project.title.substring(0, 2).toUpperCase()}
                     </div>
                     <div>
                       <h4 className="font-semibold text-slate-800">{project.title}</h4>
                       <p className="text-xs text-slate-500">{project.teamName}</p>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                       project.phase === 'Implementation' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                     }`}>
                       {project.phase}
                     </span>
                     <span className="text-xs text-slate-400">{project.lastUpdated}</span>
                   </div>
                 </div>
               ))}
               {projects.length === 0 && (
                 <div className="p-8 text-center text-slate-400">No projects found.</div>
               )}
             </div>
          </div>
        </div>

        {/* Right Column: Announcements */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Announcements</h3>
            <div className="space-y-4">
              {announcements.map(announcement => (
                <div key={announcement.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {announcement.targetRole === 'All' ? 'Everyone' : announcement.targetRole}
                    </span>
                    <span className="text-xs text-slate-400">{announcement.date}</span>
                  </div>
                  <h4 className="font-medium text-slate-800 text-sm">{announcement.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{announcement.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};