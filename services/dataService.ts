import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, setDoc, doc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { Competition, CompetitionStatus, Project, ProjectPhase, Announcement, UserRole, Team, User, College, UserStatus, ActivityLog } from '../types';

// --- MOCK SEED DATA (For Demo/Offline Mode) ---
const SEED_COLLEGES: College[] = [
  { id: 'col_1', name: 'Campus Complete Demo Univ', emailId: 'campus.edu', status: 'Active' },
  { id: 'col_2', name: 'Springfield Institute of Tech', emailId: 'springfield.edu', status: 'Active' },
  { id: 'col_3', name: 'Gotham City University', emailId: 'gcu.edu', status: 'Active' }
];

const SEED_USERS: User[] = [
  { 
    id: 'u_admin', firstName: 'System', lastName: 'Admin', name: 'System Admin', 
    email: 'admin@campus.edu', role: UserRole.ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 
    status: 'Active', uniqueId: 'ADM001', phoneNumber: '555-0100' 
    // Admin is now autonomous (no collegeId)
  },
  { 
    id: 'u_princ', firstName: 'Principal', lastName: 'Skinner', name: 'Principal Skinner', 
    email: 'principal@campus.edu', role: UserRole.PRINCIPAL, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Skinner', 
    collegeId: 'col_1', status: 'Active', uniqueId: 'PRN001', phoneNumber: '555-0101', academicBackground: 'PhD in Education' 
  },
  { 
    id: 'u_hod', firstName: 'HOD', lastName: 'Smith', name: 'HOD Smith', 
    email: 'hod@campus.edu', role: UserRole.HOD, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Smith', 
    collegeId: 'col_1', status: 'Active', uniqueId: 'HOD001', phoneNumber: '555-0102', department: 'Computer Science & Engineering', academicBackground: 'M.Tech CSE'
  },
  { 
    id: 'u_lec', firstName: 'Lecturer', lastName: 'Doe', name: 'Lecturer Doe', 
    email: 'lecturer@campus.edu', role: UserRole.LECTURER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Doe', 
    collegeId: 'col_1', status: 'Active', uniqueId: 'LEC001', phoneNumber: '555-0103', department: 'Computer Science & Engineering', academicBackground: 'B.Tech CSE'
  },
  { 
    id: 'u_stu', firstName: 'Student', lastName: 'User', name: 'Student User', 
    email: 'student@campus.edu', role: UserRole.STUDENT, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student', 
    collegeId: 'col_1', status: 'Active', uniqueId: 'STU001', phoneNumber: '555-0104', department: 'Computer Science & Engineering', academicYear: '4th Year', section: 'A'
  }
];

const SEED_COMPETITIONS: Competition[] = [
  {
    id: 'c1', title: 'Annual Hackathon 2024', description: 'Build innovative solutions for campus problems.',
    status: CompetitionStatus.ONGOING, date: 'Oct 15 - Oct 17', participants: 120,
    bannerUrl: 'https://picsum.photos/seed/hackathon/800/300'
  },
  {
    id: 'c2', title: 'Robotics Championship', description: 'Design and battle autonomous robots.',
    status: CompetitionStatus.UPCOMING, date: 'Nov 05, 2024', participants: 45,
    bannerUrl: 'https://picsum.photos/seed/robot/800/300'
  }
];

const SEED_PROJECTS: Project[] = [
  {
    id: 'p1', title: 'Smart Campus Nav', description: 'AR based navigation system for university campus.',
    teamName: 'Wayfinders', studentId: 'u_stu', competitionId: 'c1',
    phase: ProjectPhase.DEVELOPMENT, score: 85, lastUpdated: '2 hours ago'
  },
  {
    id: 'p2', title: 'Library AI Bot', description: 'Automated book tracking and suggestion system.',
    teamName: 'BookWorms', studentId: 'u_stu', competitionId: 'c1',
    phase: ProjectPhase.DESIGN, score: 92, lastUpdated: '1 day ago'
  }
];

const SEED_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'Hackathon Registration Closing', content: 'Final call for team registrations.', targetRole: 'All', date: 'Oct 10' },
  { id: 'a2', title: 'Faculty Meeting', content: 'Discussing mid-term evaluations.', targetRole: UserRole.LECTURER, date: 'Oct 12' }
];

// --- IN-MEMORY CACHE (Acts as state store for the React App) ---
let _users: User[] = [];
let _colleges: College[] = [];
let _competitions: Competition[] = [];
let _projects: Project[] = [];
let _announcements: Announcement[] = [];
let _teams: Team[] = [];
let _logs: ActivityLog[] = [];

// --- HELPERS ---
const saveToLocal = (key: string, data: any) => {
  localStorage.setItem(`cc_${key}`, JSON.stringify(data));
};

const logActivity = async (actor: User | null, action: string, details: string, type: 'info' | 'success' | 'warning' | 'error' | 'critical' = 'info') => {
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    actorId: actor?.id || 'system',
    actorName: actor?.name || 'System',
    action,
    details,
    metadata: {
      userAgent: navigator.userAgent,
      path: window.location.pathname,
      platform: navigator.platform
    },
    ipAddress: '127.0.0.1', // Placeholder for frontend; actual IP would be captured by backend middleware
    timestamp: new Date().toISOString(),
    type
  };

  // Update Cache
  _logs = [newLog, ..._logs];
  // Keep local cache manageable
  if (_logs.length > 50) _logs = _logs.slice(0, 50);
  saveToLocal('logs', _logs);

  // Update Cloud
  if (db) {
    try {
      await addDoc(collection(db, 'system_logs'), newLog);
    } catch (e) {
      console.error("Failed to push log to cloud", e);
    }
  }
};

// --- INITIALIZATION ---
export const initializeDatabase = async () => {
  console.log('Initializing Data Service...');
  let usedRemote = false;

  // 1. Try Google Cloud Firestore
  if (db) {
    try {
      console.log('Connecting to Google Cloud Firestore...');
      
      const collegeSnap = await getDocs(collection(db, 'colleges'));
      if (!collegeSnap.empty) {
        _colleges = collegeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as College));
        usedRemote = true;
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      if (!usersSnap.empty) {
        _users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      }

      const compSnap = await getDocs(collection(db, 'competitions'));
      if (!compSnap.empty) {
        _competitions = compSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competition));
      }

      const projSnap = await getDocs(collection(db, 'projects'));
      if (!projSnap.empty) {
        _projects = projSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      }

      const teamSnap = await getDocs(collection(db, 'teams'));
      if (!teamSnap.empty) {
        _teams = teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      }

      const annSnap = await getDocs(collection(db, 'announcements'));
      if (!annSnap.empty) {
        _announcements = annSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      }

      // Fetch recent logs
      const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(20));
      const logSnap = await getDocs(q);
      if (!logSnap.empty) {
        _logs = logSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      }

    } catch (err) {
      console.warn('Google Cloud Firestore connection failed, falling back to LocalStorage', err);
    }
  }

  // 2. Fallback to LocalStorage / Seed
  if (!usedRemote) {
    console.log('Using LocalStorage/Seed Data');
    const localColleges = localStorage.getItem('cc_colleges');
    
    if (localColleges && JSON.parse(localColleges).length > 0) {
      _colleges = JSON.parse(localColleges);
      _users = JSON.parse(localStorage.getItem('cc_users') || '[]');
      _competitions = JSON.parse(localStorage.getItem('cc_competitions') || '[]');
      _projects = JSON.parse(localStorage.getItem('cc_projects') || '[]');
      _announcements = JSON.parse(localStorage.getItem('cc_announcements') || '[]');
      _teams = JSON.parse(localStorage.getItem('cc_teams') || '[]');
      _logs = JSON.parse(localStorage.getItem('cc_logs') || '[]');
    } else {
      // Auto-Recover / Seed Data
      console.log('Data Missing or Empty. Re-seeding Defaults.');
      _colleges = SEED_COLLEGES;
      _users = SEED_USERS;
      _competitions = SEED_COMPETITIONS;
      _projects = SEED_PROJECTS;
      _announcements = SEED_ANNOUNCEMENTS;
      
      saveToLocal('colleges', _colleges);
      saveToLocal('users', _users);
      saveToLocal('competitions', _competitions);
      saveToLocal('projects', _projects);
      saveToLocal('announcements', _announcements);
      
      // Log initialization
      logActivity(null, 'SYSTEM_INIT', 'Database seeded with default values.', 'info');
    }
  }
};


// --- DATA ACCESSORS ---
export const getColleges = () => [..._colleges];
export const getAllUsers = () => [..._users];
export const getSystemLogs = () => [..._logs];

export const getDataForUser = (userId: string, role: UserRole) => {
  return {
    competitions: [..._competitions],
    projects: role === UserRole.STUDENT 
      ? _projects.filter(p => p.studentId === userId) 
      : [..._projects],
    announcements: role === UserRole.ADMIN 
      ? [..._announcements] // Admins see all announcements
      : _announcements.filter(a => a.targetRole === 'All' || a.targetRole === role)
  };
};

export const getUserTeams = (userId: string): Team[] => {
  return _teams.filter(t => t.members.some(m => m.userId === userId));
};

export const getPendingUsers = (approver: User): User[] => {
  if (approver.role === UserRole.ADMIN) {
    // Admin approves all Principals regardless of college
    return _users.filter(u => u.role === UserRole.PRINCIPAL && u.status === 'Pending');
  }
  if (approver.role === UserRole.PRINCIPAL) {
    return _users.filter(u => 
      u.role === UserRole.HOD && u.collegeId === approver.collegeId && u.status === 'Pending'
    );
  }
  if (approver.role === UserRole.HOD) {
    return _users.filter(u => 
      u.role === UserRole.LECTURER && u.collegeId === approver.collegeId && u.department === approver.department && u.status === 'Pending'
    );
  }
  if (approver.role === UserRole.LECTURER) {
    return _users.filter(u => 
      u.role === UserRole.STUDENT && u.collegeId === approver.collegeId && u.department === approver.department && u.status === 'Pending'
    );
  }
  return [];
};

// --- MUTATIONS ---

export const createTeam = async (name: string, user: User): Promise<Team> => {
  const teamId = `t${Date.now()}`;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const newTeam: Team = {
    id: teamId,
    name,
    code,
    members: [{ userId: user.id, name: user.name, role: 'Leader', avatar: user.avatar }],
    projectIds: []
  };
  
  _teams = [..._teams, newTeam];
  saveToLocal('teams', _teams);

  if (db) {
    try {
      await setDoc(doc(db, 'teams', teamId), newTeam);
    } catch (e) { console.error("Cloud sync failed", e); }
  }

  await logActivity(user, 'TEAM_CREATE', `Created new team "${name}" (Code: ${code})`, 'success');
  
  return newTeam;
};

export const joinTeam = async (code: string, user: User): Promise<Team> => {
  const team = _teams.find(t => t.code === code.trim());
  if (!team) throw new Error('Invalid invite code.');
  
  if (team.members.some(m => m.userId === user.id)) {
    throw new Error('You are already a member of this team.');
  }

  const newMember = { userId: user.id, name: user.name, role: 'Member' as const, avatar: user.avatar };
  
  const teamIndex = _teams.findIndex(t => t.id === team.id);
  if (teamIndex !== -1) {
    _teams[teamIndex].members.push(newMember);
    saveToLocal('teams', _teams);
    
    if (db) {
        try {
            await updateDoc(doc(db, 'teams', team.id), {
                members: _teams[teamIndex].members
            });
        } catch (e) { console.error("Cloud sync failed", e); }
    }
  }

  await logActivity(user, 'TEAM_JOIN', `Joined team "${team.name}"`, 'success');

  return _teams[teamIndex];
};


export const registerUser = async (userData: Partial<User>): Promise<User> => {
  if (!userData.email || !userData.role) throw new Error("Missing required fields");
  // CollegeId is optional for Admin, required for others
  if (userData.role !== UserRole.ADMIN && !userData.collegeId) throw new Error("College ID is required");

  const existing = _users.find(u => u.email.toLowerCase() === userData.email?.toLowerCase() && u.collegeId === userData.collegeId);
  if (existing) throw new Error(`Email ${userData.email} is already registered.`);

  const newId = `u${Date.now()}`;
  const newUser = {
    ...userData,
    id: newId,
    name: `${userData.firstName} ${userData.lastName}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.firstName}`,
    status: userData.status || 'Pending'
  } as User;

  _users = [..._users, newUser];
  saveToLocal('users', _users);

  if (db) {
    try {
      await setDoc(doc(db, 'users', newId), newUser);
    } catch (e) { console.error("Cloud sync failed", e); }
  }

  await logActivity(null, 'USER_REGISTER', `New registration: ${newUser.name} (${newUser.role})`, 'info');

  return newUser;
};


export const approveUser = async (userId: string): Promise<void> => {
  const index = _users.findIndex(u => u.id === userId);
  if (index !== -1) {
    const user = _users[index];
    _users[index] = { ...user, status: 'Active' };
    saveToLocal('users', _users);
    
    if (db) {
        try {
          await updateDoc(doc(db, 'users', userId), { status: 'Active' });
        } catch (e) { console.error("Cloud sync failed", e); }
    }

    await logActivity(null, 'USER_APPROVE', `Approved access for ${user.name}`, 'success');
  }
};

export const rejectUser = async (userId: string): Promise<void> => {
  const index = _users.findIndex(u => u.id === userId);
  if (index !== -1) {
    const user = _users[index];
    _users[index] = { ...user, status: 'Rejected' };
    saveToLocal('users', _users);
    
    if (db) {
        try {
          await updateDoc(doc(db, 'users', userId), { status: 'Rejected' });
        } catch (e) { console.error("Cloud sync failed", e); }
    }

    await logActivity(null, 'USER_REJECT', `Rejected access for ${user.name}`, 'warning');
  }
};

export const addCollege = async (name: string, emailId: string): Promise<College> => {
  const newCollege = {
    id: `col_${Date.now()}`,
    name,
    emailId,
    status: 'Active' as const
  };

  _colleges = [..._colleges, newCollege];
  saveToLocal('colleges', _colleges);

  if (db) {
    try {
      await setDoc(doc(db, 'colleges', newCollege.id), newCollege);
    } catch (e) { console.error("Cloud sync failed", e); }
  }

  await logActivity(null, 'COLLEGE_ADD', `Added new institution: ${name}`, 'success');

  return newCollege;
};

export const updateCollegeStatus = async (id: string, status: 'Active' | 'Suspended'): Promise<void> => {
  const index = _colleges.findIndex(c => c.id === id);
  if (index !== -1) {
    const college = _colleges[index];
    _colleges[index] = { ...college, status };
    saveToLocal('colleges', _colleges);
    
    if (db) {
        try {
          await updateDoc(doc(db, 'colleges', id), { status });
        } catch (e) { console.error("Cloud sync failed", e); }
    }

    await logActivity(null, 'COLLEGE_STATUS', `Changed status of ${college.name} to ${status}`, 'warning');
  }
};

export const removeCollege = async (id: string): Promise<void> => {
  const college = _colleges.find(c => c.id === id);
  _colleges = _colleges.filter(c => c.id !== id);
  saveToLocal('colleges', _colleges);
  
  if (db) {
      try {
        await deleteDoc(doc(db, 'colleges', id));
      } catch (e) { console.error("Cloud sync failed", e); }
  }

  await logActivity(null, 'COLLEGE_REMOVE', `Removed institution: ${college?.name}`, 'error');
};

export const resetDatabase = () => {
  localStorage.clear();
  window.location.reload();
};