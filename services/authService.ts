import { User, UserRole } from '../types';
import { getAllUsers, getColleges } from './dataService';
import { supabase } from '../lib/supabase';

export const login = async (email: string, role?: UserRole, collegeId?: string): Promise<{ user: User | null; error: string | null }> => {
  // Simulate network delay for "Production" feel
  await new Promise(resolve => setTimeout(resolve, 800));

  const users = getAllUsers();
  const colleges = getColleges();
  
  // Find user by email.
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  // System Admin Bypass: Admins are not tied to a specific college for login
  if (user && user.role !== UserRole.ADMIN) {
     if (collegeId && user.collegeId !== collegeId) {
        return { user: null, error: 'User not found in this college.' };
     }
  }

  // If role is provided (Demo Login), ensure it matches
  if (role && user && user.role !== role) {
     return { user: null, error: `Credentials invalid for ${role} role.` };
  }
  
  if (user) {
    // Check College Status (Skip for Admin)
    if (user.role !== UserRole.ADMIN && user.collegeId) {
        const userCollege = colleges.find(c => c.id === user?.collegeId);
        if (userCollege && userCollege.status === 'Suspended') {
          return { user: null, error: 'Access to this institution has been temporarily suspended.' };
        }
    }

    // Check User Status with Context-Aware Feedback
    if (user.status === 'Pending') {
      let approverRole = 'Administrator';
      if (user.role === UserRole.HOD) approverRole = 'College Principal';
      if (user.role === UserRole.LECTURER) approverRole = 'Department HOD';
      if (user.role === UserRole.STUDENT) approverRole = 'Department Lecturer';

      return { user: null, error: `Account pending approval from ${approverRole}.` };
    }

    if (user.status === 'Rejected') {
      return { user: null, error: 'Account access has been denied by the institution.' };
    }

    localStorage.setItem('cc_session', JSON.stringify(user));
    return { user: user, error: null };
  }

  return { user: null, error: 'Invalid credentials or user not found.' };
};

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error("Supabase is not initialized");
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    }
  });
  
  if (error) throw error;
};

export const logout = async () => {
    localStorage.removeItem('cc_session');
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));
};

export const getSession = (): User | null => {
  const session = localStorage.getItem('cc_session');
  return session ? JSON.parse(session) : null;
};
