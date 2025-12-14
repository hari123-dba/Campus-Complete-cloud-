import React, { useState, useEffect } from 'react';
import { UserRole, College } from '../types';
import { RoleCard } from '../components/RoleCard';
// Use the new firebase auth functions
import { firebaseLogin, firebaseSignup, sendPasswordReset, signInWithGoogle, login as mockLogin, resendVerification } from '../services/authService';
import { getColleges, resetDatabase, initializeDatabase } from '../services/dataService';
import { Trophy, AlertCircle, Loader2, School, LogIn, UserPlus, Info, RefreshCw, Upload, MailCheck, KeyRound, ArrowLeft, Database, Send, CheckCircle2 } from 'lucide-react';
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

  // Verification State
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showResend, setShowResend] = useState(false); // To show resend button in login screen

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

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
    loadInitData();
  }, []); 

  const loadInitData = async () => {
    try {
      const loadedColleges = await getColleges();
      setColleges(loadedColleges);
      
      // Auto-select first college if data exists but selection is empty/invalid
      if (loadedColleges.length > 0) {
        if (!selectedCollege) {
          setSelectedCollege(loadedColleges[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load colleges", e);
    }
  };

  const handleRetryConnection = async () => {
    setIsLoading(true);
    try {
      // Force initialization attempt
      await initializeDatabase();
      await loadInitData();
    } catch (e) {
      setError("Failed to initialize. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset messages on tab change
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
    setShowResend(false);
    if (activeTab !== 'signup') {
        setShowVerification(false);
    }
    // When switching tabs, reset forgot password flow unless we are in it
    if (!showForgotPassword) {
      setShowResetSuccess(false);
    }
  }, [activeTab, selectedCollege, showForgotPassword]);

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
    setShowResend(false);
    
    try {
      // Use Firebase Login
      const { user, error: loginError } = await firebaseLogin(loginEmail, loginPassword);
      
      if (loginError) {
        setError(loginError); // Will display "Password or Email Incorrect" or verification error
        if (loginError.includes("Email not verified")) {
          setShowResend(true);
        }
      } else if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const { user, error: googleError } = await signInWithGoogle();
        if (googleError) {
            setError(googleError);
        } else if (user) {
            onLoginSuccess(user);
        }
    } catch (err: any) {
        setError("Google Sign In failed. Please try again.");
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
      // Prepare full user data object for Firestore
      const signupData = {
        name: formData.name,
        role: formData.role,
        collegeId: selectedCollege,
        department: formData.department,
        academicYear: formData.academicYear,
        section: formData.section,
        uniqueId: formData.uniqueId,
        phoneNumber: formData.phoneNumber
      };

      // Use Firebase Signup with full data and profile photo
      const { user, error: signupError } = await firebaseSignup(
        formData.email, 
        formData.password, 
        signupData, 
        profilePhoto
      );

      if (signupError) {
        setError(signupError); // Will display "User already exists. Sign in?"
      } else if (user) {
        // Successful signup, verification email sent
        setVerificationEmail(formData.email);
        setShowVerification(true);
        // Reset form data optionally
      }
      
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email: string, pass: string) => {
      setIsLoading(true);
      setError(null);
      setSuccessMsg(null);
      try {
          const { success, error: resendError } = await resendVerification(email, pass);
          if (success) {
              setSuccessMsg("Verification email resent! Please check your inbox (and spam).");
          } else {
              setError(resendError || "Failed to resend email.");
          }
      } catch (e) {
          setError("Failed to resend verification email.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleForgotPasswordClick = () => {
    setResetEmail(loginEmail); // Pre-fill
    setShowForgotPassword(true);
    setError(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) {
          setError("Please enter your email address.");
          return;
      }
      setIsLoading(true);
      setError(null);
      try {
          const { success, error: resetError } = await sendPasswordReset(resetEmail);
          if (success) {
              setShowResetSuccess(true);
          } else {
              setError(resetError || "Failed to send reset link.");
          }
      } catch (e) {
          setError("An unexpected error occurred.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleBackToLogin = () => {
      setShowVerification(false);
      setShowForgotPassword(false);
      setShowResetSuccess(false);
      setActiveTab('login');
      // If returning from verification or reset success, ensure we show login
      setLoginEmail(verificationEmail || resetEmail || loginEmail); 
  };

  const getCollegeName = () => colleges.find(c => c.id === selectedCollege)?.name;

  const GoogleButton = () => (
      <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all flex justify-center items-center gap-2 mb-4 shadow-sm"
      >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
      </button>
  );

  const Divider = () => (
      <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-xs text-slate-400 font-medium">Or continue with</span>
          <div className="h-px bg-slate-200 flex-1"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-72 bg-blue-600 rounded-b-[3rem] -z-10 shadow-xl" />
      
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 mb-10 animate-fade-in-up">
        
        {/* Verification Screen (Signup Success) */}
        {showVerification ? (
           <div className="flex flex-col items-center text-center animate-fade-in py-8">
               <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                   <MailCheck size={40} />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox</h2>
               <p className="text-slate-600 mb-6 leading-relaxed">
                   We have sent you a verification email to <br/>
                   <span className="font-semibold text-slate-800">{verificationEmail}</span>.
                   <br/>Verify it and log in.
               </p>

               {successMsg && (
                    <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center gap-2 text-green-700 text-sm animate-fade-in w-full">
                        <CheckCircle2 size={16} />
                        <span>{successMsg}</span>
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center gap-2 text-red-700 text-sm animate-fade-in w-full">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

               <div className="flex flex-col gap-3 w-full">
                   <button 
                      onClick={handleBackToLogin}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
                   >
                      <LogIn size={18} /> Login
                   </button>
                   <button 
                      onClick={() => handleResendVerification(verificationEmail, formData.password)}
                      disabled={isLoading}
                      className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 text-sm"
                   >
                      {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} 
                      Resend Verification Email
                   </button>
               </div>
           </div>
        ) : showForgotPassword ? (
            /* Forgot Password Flow */
            showResetSuccess ? (
                <div className="flex flex-col items-center text-center animate-fade-in py-8">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <MailCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your email</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        We sent you a password change link to <br/>
                        <span className="font-semibold text-slate-800">{resetEmail}</span>.
                    </p>
                    <button 
                        onClick={handleBackToLogin}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
                    >
                        <LogIn size={18} /> Sign In
                    </button>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <button onClick={handleBackToLogin} className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                        <ArrowLeft size={18} className="mr-1" /> Back
                    </button>
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner">
                            <KeyRound size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 text-center">Forgot Password?</h2>
                        <p className="text-slate-500 text-center mt-1">Enter your email to receive a reset link.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-fade-in">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="name@college.edu"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2 mt-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Get Reset Link'}
                        </button>
                    </form>
                </div>
            )
        ) : (
        /* Main Auth Flow */
        <>
            <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner">
                <Trophy size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 text-center">Campus Complete</h1>
            <p className="text-slate-500 text-center mt-1">Project & Competition Manager</p>
            </div>

            {/* Fallback for Broken Data State */}
            {colleges.length === 0 && !isLoading && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-bold text-yellow-800 mb-1">System Data Missing</h3>
                <p className="text-sm text-yellow-700 mb-3">No colleges detected. This can happen if the database is empty.</p>
                <button 
                onClick={handleRetryConnection}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
                >
                 {isLoading ? <Loader2 className="animate-spin" size={14} /> : <Database size={14} />} 
                 Load Sample Data
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
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2 text-red-700 text-sm animate-fade-in">
                <div className="flex items-start gap-3">
                   <AlertCircle size={18} className="shrink-0 mt-0.5" />
                   <span>{error}</span>
                </div>
                {/* Resend Link in Login View */}
                {showResend && activeTab === 'login' && (
                    <button 
                      onClick={() => handleResendVerification(loginEmail, loginPassword)}
                      className="self-end text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={12} /> : "Didn't receive it? Resend Email"}
                    </button>
                )}
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
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        <button type="button" onClick={handleForgotPasswordClick} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                            Forgot password?
                        </button>
                    </div>
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

                <Divider />
                <GoogleButton />
            </div>
            )}

            {activeTab === 'signup' && (
            <div className="animate-fade-in max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <form onSubmit={handleSignup} className="space-y-4">
                    
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

                <Divider />
                <GoogleButton />
            </div>
            )}

            <div className="mt-8 text-center text-xs text-slate-300">
            Selected: {getCollegeName()}
            </div>
        </>
        )}
      </div>

      <PWAInstallPrompt />
    </div>
  );
};