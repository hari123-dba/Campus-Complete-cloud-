import React, { useState, useEffect } from 'react';
import { UserRole, College } from '../types';
import { RoleCard } from '../components/RoleCard';
// Use the new firebase auth functions
import { firebaseLogin, firebaseSignup, login as mockLogin } from '../services/authService';
import { getColleges, resetDatabase } from '../services/dataService';
import { Trophy, AlertCircle, Loader2, School, LogIn, UserPlus, Info, RefreshCw, Upload } from 'lucide-react';
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
    name: '', // Combined name
    email: '',
    password: '',
    repeatPassword: '',
    role: UserRole.STUDENT,
    // Maintaining these for UI consistency although unused in Firebase auth strictly
    collegeId: '',
    department: '',
    academicYear: '',
    section: '',
    uniqueId: '',
    phoneNumber: ''
  });
  
  // File state for Profile Photo
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Initial Data Load
  useEffect(() => {
    const loadedColleges = getColleges();
    setColleges(loadedColleges);
    
    // Auto-select first college if data exists but selection is empty/invalid
    if (loadedColleges.length > 0) {
      const isValid = loadedColleges.find(c => c.id === selectedCollege);
      if (!isValid || !selectedCollege) {
        setSelectedCollege(loadedColleges[0].id);
      }
    }
  }, [selectedCollege]); 

  // Reset messages on tab change
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [activeTab, selectedCollege]);

  const handleDemoLogin = async (role: UserRole, email: string) => {
    if (role !== UserRole.ADMIN && selectedCollege !== 'col_1') {
      setError('Quick Demo is only available for "Campus Complete Demo Univ"');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Keep mock login for Demo functionality
      const { user, error: loginError } = await mockLogin(email, role, selectedCollege);
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
      // Use Firebase Login
      const { user, error: loginError } = await firebaseLogin(loginEmail, loginPassword);
      
      if (loginError) {
        setError(loginError); // Will display "Password or Email Incorrect"
      } else if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.repeatPassword) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.repeatPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      // Use Firebase Signup
      const { user, error: signupError } = await firebaseSignup(formData.email, formData.password, formData.name);

      if (signupError) {
        setError(signupError); // Will display "User already exists. Sign in?"
      } else if (user) {
        // If we were saving user info, we would handle profile photo upload here
        // For now, just authenticate
        setSuccessMsg("Account created successfully!");
        onLoginSuccess(user);
      }
      
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

        {/* Fallback for Broken Data State */}
        {colleges.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
             <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
             <h3 className="font-bold text-yellow-800 mb-1">System Data Missing</h3>
             <p className="text-sm text-yellow-700 mb-3">No colleges detected. This can happen after a deployment or cache clear.</p>
             <button 
               onClick={resetDatabase}
               className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
             >
               <RefreshCw size={14} /> Reset Demo Data
             </button>
          </div>
        )}

        {/* College Selector (Global - Visible for Demo/Login) */}
        {colleges.length > 0 && activeTab === 'demo' && (
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
                {selectedCollege === 'col_1' ? 'Tap any role below to auto-fill credentials' : 'Switch to "Campus Complete Demo Univ" for quick access (Admin is global)'}
              </p>
            </div>
            {(Object.values(UserRole) as UserRole[]).map((role) => (
              <RoleCard 
                key={role} 
                role={role} 
                onClick={handleDemoLogin}
                isLoading={isLoading || (selectedCollege !== 'col_1' && role !== UserRole.ADMIN)}
              />
            ))}
          </div>
        )}

        {activeTab === 'login' && (
          <div className="space-y-4 animate-fade-in">
            <form onSubmit={handleStandardLogin} className="space-y-4">
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
          </div>
        )}

        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Profile Photo Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {profilePhoto ? (
                             <div className="flex flex-col items-center">
                                <span className="text-sm text-green-600 font-semibold mb-1">Photo Selected</span>
                                <span className="text-xs text-slate-500">{profilePhoto.name}</span>
                             </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                            </>
                        )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setProfilePhoto(e.target.files[0])} />
                </label>
              </div>
            </div>

            {/* Basic Info */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Jane Doe"
              />
            </div>

            {/* Institution Selector for Signup */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Institution</label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <select 
                  value={selectedCollege} 
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium appearance-none cursor-pointer text-sm"
                >
                  <option value="" disabled>Select College</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Selection */}
             <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-blue-700 text-sm"
              >
                {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Extra Role Fields (Optional for generic auth, but good for UX if needed) */}
            {formData.role !== UserRole.ADMIN && (
               <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                    <select 
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="">Select Department (Optional)</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
               </>
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
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Repeat Password</label>
                  <input 
                    type="password" required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.repeatPassword}
                    onChange={(e) => setFormData({...formData, repeatPassword: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <><UserPlus size={18} /> Sign Up</>}
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