import { Competition, CompetitionStatus, Project, ProjectPhase, Announcement, UserRole, Team, User, College, ActivityLog, TeamMember } from '../types';
import { db, storage, auth } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { deleteUser } from 'firebase/auth';

// --- MOCK SEED DATA (For Demo/Offline Mode) ---
const SEED_COLLEGES: College[] = [
  { 
    id: 'col_1', 
    name: 'Campus Complete Demo Univ', 
    emailId: 'campus.edu', 
    website: 'https://demo.campus.edu', 
    address: '123 Innovation Drive, Tech City',
    contactPhone: '555-0199',
    status: 'Active',
    createdAt: new Date('2023-01-15').toISOString()
  },
  { 
    id: 'col_2', 
    name: 'Springfield Institute of Tech', 
    emailId: 'springfield.edu', 
    website: 'https://sit.edu',
    address: '742 Evergreen Terrace, Springfield',
    contactPhone: '555-0200',
    status: 'Active',
    createdAt: new Date('2023-03-10').toISOString()
  }
];

const SEED_USERS: User[] = [
  { 
    id: 'u_admin', firstName: 'System', lastName: 'Admin', name: 'System Admin', 
    email: 'admin@campus.edu', role: UserRole.ADMIN, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 
    status: 'Active', uniqueId: 'ADM001', phoneNumber: '555-0100' 
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
  }
];

const SEED_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'Hackathon Registration Closing', content: 'Final call for team registrations.', targetRole: 'All', date: 'Oct 10' }
];

// --- IN-MEMORY CACHE ---
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
    metadata: { userAgent: navigator.userAgent },
    ipAddress: '127.0.0.1',
    timestamp: new Date().toISOString(),
    type
  };

  _logs = [newLog, ..._logs].slice(0, 50);
  saveToLocal('logs', _logs);
};

// --- INITIALIZATION ---
export const initializeDatabase = async () => {
  console.log('Initializing Data Service (Local Mode)...');
  
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
    console.log('Data Missing. Seeding Defaults.');
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
  }
};


// --- FIRESTORE USER MANAGEMENT ---

export const uploadImage = async (file: File, path: string): Promise<{ url: string }> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url };
};

export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error.code !== 'storage/object-not-found') {
      console.error("Delete file error:", error);
      throw error;
    }
  }
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, 'users', uid);
  // Use setDoc with merge: true to handle cases where the document doesn't exist (e.g. demo users)
  await setDoc(userRef, data, { merge: true });
  
  // Update local session if needed
  const currentSession = localStorage.getItem('cc_session');
  if (currentSession) {
    const sessionUser = JSON.parse(currentSession);
    if (sessionUser.id === uid) {
      localStorage.setItem('cc_session', JSON.stringify({ ...sessionUser, ...data }));
    }
  }
};

export const deleteUserAccount = async (uid: string) => {
  // 1. Delete Firestore Doc
  await deleteDoc(doc(db, 'users', uid));
  
  // 2. Delete Auth User
  if (auth.currentUser && auth.currentUser.uid === uid) {
      await deleteUser(auth.currentUser);
  }
  
  localStorage.removeItem('cc_session');
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
      ? [..._announcements] 
      : _announcements.filter(a => a.targetRole === 'All' || a.targetRole === role)
  };
};

export const getUserTeams = (userId: string): Team[] => {
  return _teams.filter(t => t.members.some(m => m.userId === userId));
};

export const getPendingUsers = (approver: User): User[] => {
  if (approver.role === UserRole.ADMIN) {
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

// --- MUTATIONS (Local Storage Mock for now, except User) ---

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

  await logActivity(user, 'TEAM_CREATE', `Created new team "${name}" (Code: ${code})`, 'success');
  return newTeam;
};

export const joinTeam = async (code: string, user: User): Promise<Team> => {
  const team = _teams.find(t => t.code === code.trim());
  if (!team) throw new Error('Invalid invite code.');
  
  if (team.members.some(m => m.userId === user.id)) {
    throw new Error('You are already a member of this team.');
  }

  const newMember: TeamMember = { userId: user.id, name: user.name, role: 'Member', avatar: user.avatar };
  
  const teamIndex = _teams.findIndex(t => t.id === team.id);
  if (teamIndex !== -1) {
    _teams[teamIndex].members.push(newMember);
    saveToLocal('teams', _teams);
  }

  await logActivity(user, 'TEAM_JOIN', `Joined team "${team.name}"`, 'success');
  return _teams[teamIndex];
};

export const createProject = async (
  projectData: { title: string; description: string; competitionId: string },
  teamId: string,
  user: User
): Promise<Project> => {
  const team = _teams.find(t => t.id === teamId);
  if (!team) throw new Error("Team not found");

  const newProject: Project = {
    id: `p${Date.now()}`,
    title: projectData.title,
    description: projectData.description,
    teamName: team.name,
    studentId: user.id,
    competitionId: projectData.competitionId,
    phase: ProjectPhase.DESIGN,
    score: 0,
    lastUpdated: 'Just now'
  };

  _projects = [..._projects, newProject];
  saveToLocal('projects', _projects);
  
  // Link to Team (Local)
  const teamIndex = _teams.findIndex(t => t.id === teamId);
  if (teamIndex !== -1) {
    const updatedTeam = { ..._teams[teamIndex] };
    if (!updatedTeam.projectIds) updatedTeam.projectIds = [];
    updatedTeam.projectIds.push(newProject.id);
    _teams[teamIndex] = updatedTeam;
    saveToLocal('teams', _teams);
  }
  
  await logActivity(user, 'PROJECT_CREATE', `Created project "${newProject.title}" for team ${team.name}`, 'success');
  return newProject;
};


export const registerUser = async (userData: Partial<User>, specificId?: string): Promise<User> => {
  // Legacy function for mock data (Login.tsx now uses authService for real firebase signup)
  if (!userData.email || !userData.role) throw new Error("Missing required fields");
  if (userData.role !== UserRole.ADMIN && !userData.collegeId) throw new Error("College ID is required");

  const existing = _users.find(u => u.email.toLowerCase() === userData.email?.toLowerCase() && u.collegeId === userData.collegeId);
  if (existing) throw new Error(`Email ${userData.email} is already registered.`);

  const newId = specificId || `u${Date.now()}`;
  const newUser = {
    ...userData,
    id: newId,
    name: `${userData.firstName} ${userData.lastName}`,
    avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.firstName}`,
    status: userData.status || 'Pending'
  } as User;

  _users = [..._users, newUser];
  saveToLocal('users', _users);

  await logActivity(null, 'USER_REGISTER', `New registration: ${newUser.name} (${newUser.role})`, 'info');
  return newUser;
};


export const approveUser = async (userId: string): Promise<void> => {
  const index = _users.findIndex(u => u.id === userId);
  if (index !== -1) {
    const user = _users[index];
    _users[index] = { ...user, status: 'Active' };
    saveToLocal('users', _users);
    
    await logActivity(null, 'USER_APPROVE', `Approved access for ${user.name}`, 'success');
  }
};

export const rejectUser = async (userId: string): Promise<void> => {
  const index = _users.findIndex(u => u.id === userId);
  if (index !== -1) {
    const user = _users[index];
    _users[index] = { ...user, status: 'Rejected' };
    saveToLocal('users', _users);
    
    await logActivity(null, 'USER_REJECT', `Rejected access for ${user.name}`, 'warning');
  }
};

export const addCollege = async (details: Omit<College, 'id' | 'status' | 'createdAt'>): Promise<College> => {
  const newCollege: College = {
    id: `col_${Date.now()}`,
    ...details,
    status: 'Active',
    createdAt: new Date().toISOString()
  };

  _colleges = [..._colleges, newCollege];
  saveToLocal('colleges', _colleges);

  await logActivity(null, 'COLLEGE_ADD', `Added new institution: ${newCollege.name}`, 'success');
  return newCollege;
};

export const updateCollegeStatus = async (id: string, status: 'Active' | 'Suspended'): Promise<void> => {
  const index = _colleges.findIndex(c => c.id === id);
  if (index !== -1) {
    const college = _colleges[index];
    _colleges[index] = { ...college, status };
    saveToLocal('colleges', _colleges);
    
    await logActivity(null, 'COLLEGE_STATUS', `Changed status of ${college.name} to ${status}`, 'warning');
  }
};

export const removeCollege = async (id: string): Promise<void> => {
  const college = _colleges.find(c => c.id === id);
  _colleges = _colleges.filter(c => c.id !== id);
  saveToLocal('colleges', _colleges);
  
  await logActivity(null, 'COLLEGE_REMOVE', `Removed institution: ${college?.name}`, 'error');
};

export const resetDatabase = () => {
  localStorage.clear();
  window.location.reload();
};