import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { updateUserProfile, deleteUserAccount } from '../services/dataService';
import { logout } from '../services/authService';
import { UserCircle, Save, Trash2, Phone, CreditCard, Mail, Building, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileProps {
  user: User;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    setFormData({
        name: user.name,
        phoneNumber: user.phoneNumber,
        uniqueId: user.uniqueId,
        department: user.department,
        academicYear: user.academicYear,
        section: user.section
    });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg(null);
    try {
        await updateUserProfile(user.id, formData);
        setMsg({ type: 'success', text: 'Profile updated successfully.' });
        setIsEditing(false);
        // Refresh page to sync all states if needed, though local storage is updated
        setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
        setMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        setIsLoading(true);
        try {
            await deleteUserAccount(user.id);
            await logout();
            window.location.reload();
        } catch (err: any) {
            setMsg({ type: 'error', text: 'Failed to delete account. Please login again and retry.' });
            setIsLoading(false);
        }
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-20">
       <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500">Manage your account settings and preferences</p>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Cover */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
             <div className="absolute -bottom-12 left-6 md:left-10">
                <div className="relative">
                   <img src={user.avatar} className="w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-white object-cover" alt="Profile" />
                   {/* Edit photo button could go here */}
                </div>
             </div>
          </div>

          <div className="pt-16 pb-8 px-6 md:px-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                   <p className="text-slate-500 font-medium">{user.role} • {user.status}</p>
                   {/* Display filename if it exists in data structure for verification of the requirement */}
                   {(user as any).photoFileName && <p className="text-xs text-slate-400 mt-1">File: {(user as any).photoFileName}</p>}
                </div>
                {!isEditing && (
                    <button 
                       onClick={() => setIsEditing(true)}
                       className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors"
                    >
                       Edit Profile
                    </button>
                )}
             </div>

             {msg && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {msg.text}
                </div>
             )}

             <form onSubmit={handleSave}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Read Only Fields */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Account Information</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                                <Mail size={16} />
                                <span className="flex-1">{user.email}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Institution ID</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                                <Building size={16} />
                                <span className="flex-1">{user.collegeId}</span>
                            </div>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Personal Details</h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    disabled={!isEditing}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="tel" 
                                    disabled={!isEditing}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={formData.phoneNumber || ''}
                                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Student/Staff ID</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    disabled={!isEditing}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={formData.uniqueId || ''}
                                    onChange={e => setFormData({...formData, uniqueId: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        {/* Optional Academic Fields */}
                        {user.role === 'Student' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditing}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formData.academicYear || ''}
                                        onChange={e => setFormData({...formData, academicYear: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                                    <input 
                                        type="text" 
                                        disabled={!isEditing}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                        value={formData.section || ''}
                                        onChange={e => setFormData({...formData, section: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                 </div>

                 {isEditing && (
                     <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                         <button 
                            type="button" 
                            onClick={() => { setIsEditing(false); setFormData(user); }}
                            className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                         >
                            Cancel
                         </button>
                         <button 
                            type="submit" 
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2"
                         >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Changes
                         </button>
                     </div>
                 )}
             </form>

             <div className="mt-12 pt-8 border-t border-slate-100">
                <h3 className="font-bold text-red-600 text-xs uppercase tracking-wider mb-4">Danger Zone</h3>
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
                    <div>
                        <h4 className="font-bold text-red-900 text-sm">Delete Account</h4>
                        <p className="text-red-700 text-xs mt-0.5">Permanently remove your account and all associated data.</p>
                    </div>
                    <button 
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};