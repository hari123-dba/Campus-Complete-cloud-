import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ProjectPhase, College, ActivityLog, CompetitionStatus } from '../types';
import { getDataForUser, getPendingUsers, approveUser, rejectUser, addCollege, getColleges, updateCollegeStatus, removeCollege, getAllUsers, getSystemLogs } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  Clock, TrendingUp, AlertCircle, CheckCircle2, UserCheck, XCircle, 
  School, X, Loader2, Shield, Users, Trophy, Award,
  FileText, Activity, BarChart2, Power, Trash2, Building2, FolderKanban, ClipboardCheck, Globe, MapPin, Phone, UserCog, GraduationCap, Zap, ChevronRight, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const { competitions, projects, announcements } = getDataForUser(user.id, user.role);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  
  // Admin & Management: Data States
  const [showAddCollegeModal, setShowAddCollegeModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // New College Form State
  const [newCollegeForm, setNewCollegeForm] = useState({ 
    name: '', emailId: '', website: '', address: '', contactPhone: ''
  });
  
  // Directory State
  const [collegeList, setCollegeList] = useState<College[]>([]);
  const [allSystemUsers, setAllSystemUsers] = useState<User[]>([]);
  const [systemLogs, setSystemLogs] = useState<ActivityLog[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalMsg, setModalMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Initial Fetch for Management Roles
  useEffect(() => {
    // Fetch system users for all management roles to calculate stats
    if (user.role !== UserRole.STUDENT) {
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

  // --- ACTIONS ---
  const handleApprove = async (id: string) => {
    await approveUser(id);
    setProcessedIds(prev => [...prev, id]);
    if (user.role !== UserRole.STUDENT) setAllSystemUsers(getAllUsers());
  };

  const handleReject = async (id: string) => {
    if(window.confirm("Are you sure you want to reject this user?")) {
      await rejectUser(id);
      setProcessedIds(prev => [...prev, id]);
      if (user.role !== UserRole.STUDENT) setAllSystemUsers(getAllUsers());
    }
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalMsg(null);
    try {
      await addCollege({ ...newCollegeForm });
      setModalMsg({ type: 'success', text: 'College added successfully.' });
      setNewCollegeForm({ name: '', emailId: '', website: '', address: '', contactPhone: '' });
      setCollegeList([...getColleges()]);
      setSystemLogs(getSystemLogs());
      setTimeout(() => { setModalMsg(null); setShowAddCollegeModal(false); }, 1500);
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
  };

  const handleRemoveCollege = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this college?')) {
      await removeCollege(id);
      setCollegeList([...getColleges()]);
    }
  };

  // --- STATS CALCULATION ---
  const dashboardStats = useMemo(() => {
    // 1. Common Stats
    const activeCompetitions = competitions.filter(c => c.status === CompetitionStatus.ONGOING).length;
    
    // 2. Role Specific Logic
    if (user.role === UserRole.PRINCIPAL) {
        const collegeUsers = allSystemUsers.filter(u => u.collegeId === user.collegeId);
        const uniqueDepts = new Set(collegeUsers.map(u => u.department).filter(Boolean)).size;
        return {
            title: "Principal Dashboard",
            stats: [
                { label: "Departments", value: uniqueDepts, icon: Building2, color: "bg-purple-600" },
                { label: "Total Students", value: collegeUsers.filter(u => u.role === UserRole.STUDENT).length, icon: Users, color: "bg-blue-600" },
                { label: "Active Competitions", value: activeCompetitions, icon: Award, color: "bg-green-500" },
                { label: "Pending Approvals", value: pendingUsers.length, icon: ClipboardCheck, color: "bg-orange-500" }
            ]
        };
    }

    if (user.role === UserRole.HOD) {
        const deptUsers = allSystemUsers.filter(u => u.collegeId === user.collegeId && u.department === user.department);
        // Estimate Dept Projects (by finding students in this dept)
        const deptStudentIds = deptUsers.filter(u => u.role === UserRole.STUDENT).map(u => u.id);
        const deptProjectsCount = projects.filter(p => deptStudentIds.includes(p.studentId)).length; 

        return {
            title: `Department: ${user.department}`,
            stats: [
                { label: "Lecturers", value: deptUsers.filter(u => u.role === UserRole.LECTURER).length, icon: UserCog, color: "bg-indigo-600" },
                { label: "Students", value: deptUsers.filter(u => u.role === UserRole.STUDENT).length, icon: GraduationCap, color: "bg-blue-600" },
                { label: "Dept Projects", value: deptProjectsCount || projects.length, icon: FolderKanban, color: "bg-pink-600" },
                { label: "Pending Approvals", value: pendingUsers.length, icon: ClipboardCheck, color: "bg-orange-500" }
            ]
        };
    }

    if (user.role === UserRole.LECTURER) {
        const deptUsers = allSystemUsers.filter(u => u.collegeId === user.collegeId && u.department === user.department);
        return {
            title: "Lecturer Dashboard",
            stats: [
                { label: "My Students", value: deptUsers.filter(u => u.role === UserRole.STUDENT).length, icon: GraduationCap, color: "bg-blue-600" },
                { label: "Active Projects", value: projects.length, icon: Activity, color: "bg-green-600" },
                { label: "Competitions", value: activeCompetitions, icon: Trophy, color: "bg-purple-500" },
                { label: "Pending Approvals", value: pendingUsers.length, icon: ClipboardCheck, color: "bg-orange-500" }
            ]
        };
    }

    if (user.role === UserRole.STUDENT) {
        const myActiveProjects = projects.filter(p => p.phase !== ProjectPhase.IMPLEMENTATION).length;
        const myCompletedProjects = projects.length - myActiveProjects;
        return {
            title: "Student Workspace",
            stats: [
                { label: "Active Projects", value: myActiveProjects, icon: Zap, color: "bg-blue-500" },
                { label: "Completed", value: myCompletedProjects, icon: CheckCircle2, color: "bg-green-500" },
                { label: "Competitions", value: activeCompetitions, icon: Trophy, color: "bg-purple-500" },
                { label: "Upcoming", value: "2", icon: Clock, color: "bg-orange-500", suffix: "Events" } 
            ]
        };
    }

    return null; // Admin handled separately
  }, [user, allSystemUsers, projects, competitions, pendingUsers]);


  // --- HELPER: Role Actions ---
  const getRoleActions = () => {
    const actions = [];

    if (user.role === UserRole.PRINCIPAL) {
        actions.push(
            { label: 'View Analytics', icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50', onClick: () => setShowAnalyticsModal(true) },
            { label: 'Manage Departments', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => {} },
            { label: 'View Competitions', icon: Trophy, color: 'text-green-600', bg: 'bg-green-50', onClick: () => navigate('/competitions') }
        );
    } else if (user.role === UserRole.HOD) {
        actions.push(
            { label: 'Dept. Analytics', icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50', onClick: () => setShowAnalyticsModal(true) },
            { label: 'Verify Projects', icon: ClipboardCheck, color: 'text-pink-600', bg: 'bg-pink-50', onClick: () => navigate('/projects') },
            { label: 'Manage Lecturers', icon: UserCog, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => {} }
        );
    } else if (user.role === UserRole.LECTURER) {
         actions.push(
            { label: 'Evaluate Projects', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', onClick: () => navigate('/projects') },
            { label: 'My Students', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => navigate('/teams') },
            { label: 'Class Analytics', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => setShowAnalyticsModal(true) }
        );
    } else if (user.role === UserRole.STUDENT) {
         actions.push(
            { label: 'Register Project', icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => navigate('/competitions') },
            { label: 'Join Team', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', onClick: () => navigate('/teams') },
            { label: 'View Board', icon: FolderKanban, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => navigate('/projects') }
        );
    }
    return actions;
  };

  const quickActions = getRoleActions();

  // --- RENDER HELPERS ---
  const StatCard = ({ title, value, icon: Icon, color, suffix }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all group">
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
            {value.toLocaleString()} 
            {suffix && <span className="text-sm font-medium text-slate-400">{suffix}</span>}
        </h3>
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 flex items-center justify-center transition-colors`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );

  // --- VIEW: ADMINISTRATOR ---
  if (user.role === UserRole.ADMIN) {
    const totalUsers = allSystemUsers.length;
    const activeCompetitions = competitions.filter(c => c.status === CompetitionStatus.ONGOING).length;

    // Analytics Data Prep
    const roleStats = [
      { name: 'Students', value: allSystemUsers.filter(u => u.role === UserRole.STUDENT).length, color: '#f97316' },
      { name: 'Lecturers', value: allSystemUsers.filter(u => u.role === UserRole.LECTURER).length, color: '#22c55e' },
      { name: 'HODs', value: allSystemUsers.filter(u => u.role === UserRole.HOD).length, color: '#a855f7' },
      { name: 'Principals', value: allSystemUsers.filter(u => u.role === UserRole.PRINCIPAL).length, color: '#eab308' },
      { name: 'Admins', value: allSystemUsers.filter(u => u.role === UserRole.ADMIN).length, color: '#ef4444' },
    ].filter(i => i.value > 0);

    const projectPhaseStats = [
        { name: 'Design', value: projects.filter(p => p.phase === ProjectPhase.DESIGN).length },
        { name: 'Dev', value: projects.filter(p => p.phase === ProjectPhase.DEVELOPMENT).length },
        { name: 'Test', value: projects.filter(p => p.phase === ProjectPhase.TESTING).length },
        { name: 'Deploy', value: projects.filter(p => p.phase === ProjectPhase.IMPLEMENTATION).length },
    ];

    return (
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

        {/* Pending Alerts */}
        {pendingUsers.length > 0 && (
          <div className="bg-white border-l-4 border-yellow-400 rounded-xl p-4 shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><UserCheck size={20} /></div>
               <div>
                 <h3 className="font-bold text-slate-800">{pendingUsers.length} Pending Principals</h3>
                 <p className="text-xs text-slate-500">Review new institution registrations</p>
               </div>
             </div>
             <div className="flex gap-2">
                 {pendingUsers.slice(0,3).map(u => (
                     <img key={u.id} src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="" />
                 ))}
                 {pendingUsers.length > 3 && <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-500">+{pendingUsers.length-3}</span>}
             </div>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard title="Total Users" value={totalUsers} icon={Users} color="bg-blue-600" />
           <StatCard title="Active Competitions" value={activeCompetitions} icon={Award} color="bg-purple-600" />
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
              <button onClick={() => setShowAnalyticsModal(true)} className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all group">
                 <BarChart2 size={24} className="text-slate-400 group-hover:text-purple-600" />
                 <span className="font-semibold text-sm">Analytics</span>
              </button>
              {/* Add more admin actions here */}
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
                <div key={college.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{college.name}</p>
                            <div className="flex gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1"><Globe size={12}/> {college.emailId}</span>
                              <span className="flex items-center gap-1"><MapPin size={12}/> {college.address ? college.address.split(',')[1] : 'Main Campus'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${college.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {college.status}
                        </span>
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleCollegeStatus(college)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 border border-transparent hover:border-slate-200 transition-all">
                            <Power size={16} />
                          </button>
                          <button onClick={() => handleRemoveCollege(college.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                    </div>
                </div>
              ))}
           </div>
        </div>
        
        {/* Modals & Analytics (Hidden by default) */}
        {showAddCollegeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Add College</h3>
                <button onClick={() => setShowAddCollegeModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCollege} className="space-y-4">
                {modalMsg && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${modalMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                     <AlertCircle size={16} />
                     <span>{modalMsg.text}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Institution Name</label>
                    <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Springfield Tech"
                        value={newCollegeForm.name} onChange={(e) => setNewCollegeForm({...newCollegeForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Domain (@)</label>
                    <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="univ.edu" value={newCollegeForm.emailId} onChange={(e) => setNewCollegeForm({...newCollegeForm, emailId: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input type="tel" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="555-0100" value={newCollegeForm.contactPhone} onChange={(e) => setNewCollegeForm({...newCollegeForm, contactPhone: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input type="url" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="https://" value={newCollegeForm.website} onChange={(e) => setNewCollegeForm({...newCollegeForm, website: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input type="text" required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Street, City" value={newCollegeForm.address} onChange={(e) => setNewCollegeForm({...newCollegeForm, address: e.target.value})} />
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
                                <Pie data={roleStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                   {roleStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                             </PieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="font-bold text-slate-800 mb-6">Project Pipeline</h3>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={projectPhaseStats} layout="vertical" margin={{left: 20}}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // --- VIEW: PRINCIPAL, HOD, LECTURER, STUDENT ---
  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.firstName}!</h1>
          <p className="text-slate-500">{dashboardStats?.title || "Here's what's happening today."}</p>
        </div>
      </div>

      {/* Unified Pending Approvals Alert (For Approver Roles) */}
      {pendingUsers.length > 0 && user.role !== UserRole.STUDENT && (
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
                   <button onClick={() => handleReject(u.id)} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                     <XCircle size={14} /> Reject
                   </button>
                   <button onClick={() => handleApprove(u.id)} className="flex-1 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                     <CheckCircle2 size={14} /> Approve
                   </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Role Based Stats Grid */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {dashboardStats.stats.map((stat: any, idx: number) => (
               <StatCard 
                 key={idx}
                 title={stat.label}
                 value={stat.value}
                 icon={stat.icon}
                 color={stat.color}
                 suffix={stat.suffix}
               />
           ))}
        </div>
      )}
      
      {/* Role Specific Quick Actions */}
      {quickActions.length > 0 && (
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {quickActions.map((action, idx) => (
                <button 
                  key={idx}
                  onClick={action.onClick}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-blue-100 transition-all group"
                >
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.bg} ${action.color}`}>
                         <action.icon size={20} />
                      </div>
                      <span className="font-semibold text-slate-700 text-sm group-hover:text-blue-700 transition-colors">{action.label}</span>
                   </div>
                   <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                </button>
            ))}
         </div>
      )}

      {/* Main Content Grid (Projects & Announcements) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Projects Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 mb-4">
                {user.role === UserRole.STUDENT ? "My Project Scores" : "Department Progress"}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projects}>
                  <XAxis dataKey="title" tick={{fontSize: 12}} interval={0} height={40} tickFormatter={(val) => val.length > 10 ? `${val.substring(0,10)}...` : val} />
                  <YAxis />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
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
                <h3 className="font-bold text-lg text-slate-800">
                    {user.role === UserRole.STUDENT ? "Recent Projects" : "Recently Updated Projects"}
                </h3>
             </div>
             <div className="divide-y divide-slate-100">
               {projects.slice(0, 5).map(project => (
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
              {announcements.length === 0 && <p className="text-slate-400 text-sm">No new announcements.</p>}
            </div>
          </div>
        </div>
      </div>
      
      {/* Analytics Modal Re-used for HOD/Principal/Lecturer */}
      {showAnalyticsModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">
                 <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center rounded-t-3xl">
                    <h2 className="text-xl font-bold text-slate-900">
                        {user.role === UserRole.LECTURER ? 'Class Performance' : 'Department Analytics'}
                    </h2>
                    <button onClick={() => setShowAnalyticsModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                 </div>
                 <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-2">
                         <div className="h-64 flex items-center justify-center text-slate-400 flex-col">
                            <BarChart2 size={48} className="mb-2 opacity-20" />
                            <p>Detailed analytics module is under development.</p>
                         </div>
                     </div>
                 </div>
              </div>
           </div>
        )}
    </div>
  );
};