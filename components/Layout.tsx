import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { LayoutDashboard, Trophy, FolderKanban, Users, LogOut, Menu, Bell, Plus } from 'lucide-react';
import { logout } from '../services/authService';
import { getPendingUsers } from '../services/dataService';

interface LayoutProps {
  children: ReactNode;
  user: User;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check for notifications (Pending Approvals) based on hierarchy
  useEffect(() => {
    // Only fetch if the user has a role that can approve others
    if (user.role !== UserRole.STUDENT) {
      const updateCount = () => {
        const count = getPendingUsers(user).length;
        setPendingCount(count);
      };
      
      updateCount();
      // Poll every 5 seconds for demo purposes
      const interval = setInterval(updateCount, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/competitions', label: 'Competitions', icon: Trophy },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/teams', label: 'Teams', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white z-30 border-b border-slate-200 flex items-center justify-between px-4 md:hidden pt-safe">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
             <Trophy className="text-white w-5 h-5" />
           </div>
           <span className="font-bold text-slate-800">CompeteHub</span>
        </div>
        <div className="flex items-center gap-3">
          {user.role !== UserRole.STUDENT && (
             <Link to="/" className="relative p-1">
               <Bell className="w-6 h-6 text-slate-600" />
               {pendingCount > 0 && (
                 <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                   {pendingCount}
                 </span>
               )}
             </Link>
          )}
          <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-200 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:flex md:flex-col`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
             <Trophy className="text-white w-6 h-6" />
           </div>
           <div>
             <h1 className="font-bold text-lg leading-tight">Campus<br/>Complete</h1>
           </div>
        </div>

        <div className="p-4 border-b border-slate-800">
           <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
             <img src={user.avatar} className="w-10 h-10 rounded-full" alt="" />
             <div className="overflow-hidden">
               <p className="font-semibold text-sm truncate">{user.name}</p>
               <p className="text-xs text-slate-400 truncate">{user.role}</p>
             </div>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = location.pathname === item.path;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
               >
                 <Icon size={20} />
                 {item.label}
                 {/* Dashboard Notification Dot for Desktop */}
                 {item.path === '/' && user.role !== UserRole.STUDENT && pendingCount > 0 && (
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full"></span>
                 )}
               </Link>
             );
          })}
        </nav>

        <div className="p-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:w-auto mt-16 md:mt-0 mb-20 md:mb-0 overflow-y-auto h-safe-screen">
        {/* Desktop Header for Notifications */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white sticky top-0 z-20">
           <h2 className="text-xl font-bold text-slate-800">
             {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
           </h2>
           <div className="flex items-center gap-4">
              {user.role !== UserRole.STUDENT && (
                <div className="relative">
                  <Bell className="w-6 h-6 text-slate-400" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {pendingCount}
                    </span>
                  )}
                </div>
              )}
           </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = location.pathname === item.path;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
               >
                 <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                 <span className="text-[10px] font-medium">{item.label}</span>
                 {item.path === '/' && user.role !== UserRole.STUDENT && pendingCount > 0 && (
                   <span className="absolute top-2 right-8 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                 )}
               </Link>
             );
          })}
        </div>
      </nav>
    </div>
  );
};