import React, { useState, useEffect } from 'react';
import { UserRole, College } from '../types';
import { RoleCard } from '../components/RoleCard';
import { login } from '../services/authService';
import { registerUser, getColleges } from '../services/dataService';
import { Trophy, AlertCircle, Loader2, School, LogIn, UserPlus, Info } from 'lucide-react';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { DEPARTMENTS, ACADEMIC_YEARS } from '../constants';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'login' | 'signup'>('demo');
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Signup Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    uniqueId: '',
    phoneNumber: '',
    role: UserRole.STUDENT,
    department: '',
    academicYear: '',
    section: '',
    academicBackground: '',
    password: ''
  });

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Initial Data Load
  useEffect(() => {
    const loadedColleges = getColleges();
    setColleges(loadedColleges);
    if (loadedColleges.length > 0) {
      setSelectedCollege(loadedColleges[0].id);
    }
  }, []);

  // Reset messages on tab change
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [activeTab, selectedCollege]);

  const handleDemoLogin = async (role: UserRole, email: string) => {
    if (selectedCollege !== 'col_1') {
      setError('Quick Demo is only available for "Campus Complete Demo Univ"');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { user, error: loginError } = await login(email, role, selectedCollege);
      if (loginError) throw new Error(loginError);
      if (user) onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { user, error: loginError } = await login(loginEmail, undefined, selectedCollege);
      if (loginError) throw new Error(loginError);
      if (user) onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!selectedCollege) {
      setError("Please select an institution.");
      setIsLoading(false);
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.uniqueId || !formData.phoneNumber || !formData.email || !formData.password) {
      setError("Please fill in all required basic fields.");
      setIsLoading(false);
      return;
    }

    if ((formData.role === UserRole.HOD || formData.role === UserRole.LECTURER || formData.role === UserRole.STUDENT) && !formData.department) {
      setError("Please select a department.");
      setIsLoading(false);
      return;
    }

    if (formData.role === UserRole.STUDENT && (!formData.academicYear || !formData.section)) {
      setError("Please provide academic year and section.");
      setIsLoading(false);
      return;
    }

    try {
      // Determine Approval requirements text
      let approvalMsg = "Signup successful!";
      if (formData.role === UserRole.PRINCIPAL) approvalMsg += " Pending Administrator approval.";
      else if (formData.role === UserRole.HOD) approvalMsg += " Pending Principal approval.";
      else if (formData.role === UserRole.LECTURER) approvalMsg += " Pending HOD approval.";
      else if (formData.role === UserRole.STUDENT) approvalMsg += " Pending Lecturer approval.";

      const newUser = await registerUser({
        ...formData,
        collegeId: selectedCollege,
        // All self-signups via this form are 'Pending' by default as per requirements hierarchy
        status: 'Pending' 
      });

      setSuccessMsg(approvalMsg);
      // Reset form
      setFormData({
        firstName: '', lastName: '', email: '', uniqueId: '', phoneNumber: '',
        role: UserRole.STUDENT, department: '', academicYear: '', section: '',
        academicBackground: '', password: ''
      });
      
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getCollegeName = () => colleges.find(c => c.id === selectedCollege)?.name;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-72 bg-blue-600 rounded-b-[3rem] -z-10 shadow-xl" />
      
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-10 animate-fade-in-up">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner">
            <Trophy size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 text-center">Campus Complete</h1>
          <p className="text-slate-500 text-center mt-1">Project & Competition Manager</p>
        </div>

        {/* College Selector (Global - Visible for Demo/Login) */}
        {activeTab !== 'signup' && (
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Select Institution</label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select 
                value={selectedCollege} 
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium appearance-none cursor-pointer"
              >
                {colleges.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Auth Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('demo')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'demo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Demo
          </button>
          <button 
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 text-green-700 text-sm animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'demo' && (
          <div className="space-y-4 animate-fade-in">
             <div className="text-center mb-4">
              <p className="text-xs text-slate-400">
                {selectedCollege === 'col_1' ? 'Tap any role below to auto-fill credentials' : 'Switch to "Campus Complete Demo Univ" for quick access'}
              </p>
            </div>
            {(Object.values(UserRole) as UserRole[]).map((role) => (
              <RoleCard 
                key={role} 
                role={role} 
                onClick={handleDemoLogin}
                isLoading={isLoading || selectedCollege !== 'col_1'}
              />
            ))}
          </div>
        )}

        {activeTab === 'login' && (
          <form onSubmit={handleStandardLogin} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@college.edu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>
        )}

        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Institution Selector for Signup */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select 
                  required
                  value={selectedCollege} 
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select College</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Selection */}
             <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">I am a...</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-blue-700"
              >
                {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unique ID</label>
                <input 
                  type="text" required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.uniqueId}
                  onChange={(e) => setFormData({...formData, uniqueId: e.target.value})}
                  placeholder="ID-12345"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <input 
                  type="tel" required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="555-0000"
                />
              </div>
            </div>

            {/* Department Selection (HOD, Lecturer, Student) */}
            {(formData.role === UserRole.HOD || formData.role === UserRole.LECTURER || formData.role === UserRole.STUDENT) && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                <select 
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {formData.role === UserRole.HOD && (
                  <p className="text-[10px] text-slate-400 mt-1">Select the department you head.</p>
                )}
              </div>
            )}

            {/* Student Specific Fields */}
            {formData.role === UserRole.STUDENT && (
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label>
                   <select 
                      required
                      value={formData.academicYear}
                      onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                   >
                     <option value="">Year</option>
                     {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                   <input 
                      type="text" required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={formData.section}
                      onChange={(e) => setFormData({...formData, section: e.target.value})}
                      placeholder="e.g. A"
                   />
                 </div>
               </div>
            )}

            {/* Info Dialog Box (Principal, HOD, Lecturer) */}
            {(formData.role === UserRole.PRINCIPAL || formData.role === UserRole.HOD || formData.role === UserRole.LECTURER) && (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                 <div className="flex items-center gap-2 mb-2 text-blue-800">
                    <Info size={16} />
                    <span className="text-xs font-bold">Academic Background / Info</span>
                 </div>
                 <textarea 
                    className="w-full p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm text-slate-700"
                    rows={3}
                    placeholder="Briefly describe your academic background..."
                    value={formData.academicBackground}
                    onChange={(e) => setFormData({...formData, academicBackground: e.target.value})}
                 />
               </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="name@college.edu"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Create Password</label>
              <input 
                type="password" required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>

            <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg flex gap-2">
               <AlertCircle size={16} className="shrink-0" />
               {formData.role === UserRole.PRINCIPAL && "Requires Administrator approval."}
               {formData.role === UserRole.HOD && "Requires Principal approval."}
               {formData.role === UserRole.LECTURER && "Requires HOD approval."}
               {formData.role === UserRole.STUDENT && "Requires Lecturer approval."}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <><UserPlus size={18} /> Create Account</>}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-slate-300">
          Selected: {getCollegeName()}
        </div>
      </div>

      <PWAInstallPrompt />
    </div>
  );
};