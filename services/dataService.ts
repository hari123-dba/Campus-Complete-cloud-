import { Competition, CompetitionStatus, Project, ProjectPhase, Announcement, UserRole, Team, User, College, ActivityLog, TeamMember } from '../types';
import { db, storage, auth } from '../lib/firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, setDoc, Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { deleteUser } from 'firebase/auth';

// --- SEED DATA CONSTANTS (Kept for Database Initialization) ---
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
  },
  { 
    id: 'Iy7Ruw1dq8P1DXhidp3l', 
    name: 'Main University Campus', 
    emailId: 'main.univ.edu', 
    website: 'https://main.univ.edu',
    address: 'Administrative Block, Central District',
    contactPhone: '555-0900',
    status: 'Active',
    createdAt: new Date().toISOString()
  },
  { 
    id: 'fN22LAa9Lemb6AbOum9R', 
    name: 'Campus Cloud Institute', 
    emailId: 'cloud.campus.edu', 
    website: 'https://cloud.campus.edu',
    address: '42 Cloud Avenue, Digital City',
    contactPhone: '555-0999',
    status: 'Active',
    createdAt: new Date().toISOString()
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

// --- INITIALIZATION & SEEDING ---

export const initializeDatabase = async () => {
  try {
    const collegesRef = collection(db, 'colleges');
    const snapshot = await getDocs(query(collegesRef, limit(1)));
    
    // Only seed if database is empty
    if (snapshot.empty) {
      console.log('Seeding Database with Demo Data...');
      
      const batchPromises = [];

      // Seed Colleges
      for (const col of SEED_COLLEGES) {
        batchPromises.push(setDoc(doc(db, 'colleges', col.id), col));
      }
      
      // Seed Users
      for (const user of SEED_USERS) {
        batchPromises.push(setDoc(doc(db, 'users', user.id), user));
      }

      // Seed Competitions
      for (const comp of SEED_COMPETITIONS) {
        batchPromises.push(setDoc(doc(db, 'competitions', comp.id), comp));
      }

      // Seed Projects
      for (const proj of SEED_PROJECTS) {
        batchPromises.push(setDoc(doc(db, 'projects', proj.id), proj));
      }

      // Seed Announcements
      for (const ann of SEED_ANNOUNCEMENTS) {
        batchPromises.push(setDoc(doc(db, 'announcements', ann.id), ann));
      }

      await Promise.all(batchPromises);
      console.log('Database Seeding Complete.');
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// --- HELPER ---
const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

// --- STORAGE OPERATIONS ---

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

// --- LOGGING ---

export const logActivity = async (actor: User | null, action: string, details: string, type: 'info' | 'success' | 'warning' | 'error' | 'critical' = 'info') => {
  try {
    await addDoc(collection(db, 'logs'), {
      actorId: actor?.id || 'system',
      actorName: actor?.name || 'System',
      action,
      details,
      metadata: { userAgent: navigator.userAgent },
      ipAddress: 'Unknown',
      timestamp: new Date().toISOString(),
      type
    });
  } catch (e) {
    console.error("Failed to log activity", e);
  }
};

// --- DATA ACCESSORS (READ) ---

export const getColleges = async (): Promise<College[]> => {
  const snap = await getDocs(collection(db, 'colleges'));
  return snap.docs.map(d => mapDoc<College>(d));
};

export const getAllUsers = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => mapDoc<User>(d));
};

export const getSystemLogs = async (): Promise<ActivityLog[]> => {
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc<ActivityLog>(d));
};

export const getDataForUser = async (userId: string, role: UserRole) => {
  try {
    // 1. Fetch Competitions (All users see competitions)
    const compSnap = await getDocs(collection(db, 'competitions'));
    const competitions = compSnap.docs.map(d => mapDoc<Competition>(d));

    // 2. Fetch Announcements
    let announceQuery;
    if (role === UserRole.ADMIN) {
      announceQuery = query(collection(db, 'announcements'));
    } else {
      announceQuery = query(collection(db, 'announcements'), where('targetRole', 'in', ['All', role]));
    }
    const announceSnap = await getDocs(announceQuery);
    const announcements = announceSnap.docs.map(d => mapDoc<Announcement>(d));

    // 3. Fetch Projects based on Role
    let projects: Project[] = [];
    if (role === UserRole.STUDENT) {
      const projQuery = query(collection(db, 'projects'), where('studentId', '==', userId));
      const projSnap = await getDocs(projQuery);
      projects = projSnap.docs.map(d => mapDoc<Project>(d));
    } else {
      // Admins/Lecturers/HODs fetch all (filtered client side or via more specific queries later)
      // For simplicity in this robust setup, fetching all and letting client filter is acceptable for reasonable data sizes.
      // Optimally: Filter by collegeId for Principal/HOD.
      const projSnap = await getDocs(collection(db, 'projects'));
      projects = projSnap.docs.map(d => mapDoc<Project>(d));
    }

    return { competitions, projects, announcements };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return { competitions: [], projects: [], announcements: [] };
  }
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const snap = await getDocs(collection(db, 'teams'));
  const allTeams = snap.docs.map(d => mapDoc<Team>(d));
  // Firestore doesn't support array-contains-object well, easier to filter client side for complex member objects
  return allTeams.filter(t => t.members.some(m => m.userId === userId));
};

export const getPendingUsers = async (approver: User): Promise<User[]> => {
  // We can fetch based on status 'Pending' then filter by role hierarchy
  // Added Limit to improve performance
  const q = query(collection(db, 'users'), where('status', '==', 'Pending'), limit(100));
  const snap = await getDocs(q);
  const pending = snap.docs.map(d => mapDoc<User>(d));

  if (approver.role === UserRole.ADMIN) {
    return pending.filter(u => u.role === UserRole.PRINCIPAL);
  }
  if (approver.role === UserRole.PRINCIPAL) {
    return pending.filter(u => u.role === UserRole.HOD && u.collegeId === approver.collegeId);
  }
  if (approver.role === UserRole.HOD) {
    return pending.filter(u => u.role === UserRole.LECTURER && u.collegeId === approver.collegeId && u.department === approver.department);
  }
  if (approver.role === UserRole.LECTURER) {
    return pending.filter(u => u.role === UserRole.STUDENT && u.collegeId === approver.collegeId && u.department === approver.department);
  }
  return [];
};

// --- MUTATIONS (WRITE) ---

export const createTeam = async (name: string, user: User): Promise<Team> => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newTeam: Team = {
    id: '', // Will be set by doc id
    name,
    code,
    members: [{ userId: user.id, name: user.name, role: 'Leader', avatar: user.avatar }],
    projectIds: []
  };

  const docRef = await addDoc(collection(db, 'teams'), newTeam);
  // Update local object with new ID
  const createdTeam = { ...newTeam, id: docRef.id };
  // Update the doc with its own ID (optional but good for consistency if exporting)
  await updateDoc(docRef, { id: docRef.id });

  await logActivity(user, 'TEAM_CREATE', `Created new team "${name}" (Code: ${code})`, 'success');
  return createdTeam;
};

export const joinTeam = async (code: string, user: User): Promise<Team> => {
  const q = query(collection(db, 'teams'), where('code', '==', code.trim()));
  const snap = await getDocs(q);
  
  if (snap.empty) throw new Error('Invalid invite code.');
  
  const teamDoc = snap.docs[0];
  const team = mapDoc<Team>(teamDoc);

  if (team.members.some(m => m.userId === user.id)) {
    throw new Error('You are already a member of this team.');
  }

  const newMember: TeamMember = { userId: user.id, name: user.name, role: 'Member', avatar: user.avatar };
  const updatedMembers = [...team.members, newMember];

  await updateDoc(doc(db, 'teams', team.id), { members: updatedMembers });
  await logActivity(user, 'TEAM_JOIN', `Joined team "${team.name}"`, 'success');

  return { ...team, members: updatedMembers };
};

export const createProject = async (
  projectData: { title: string; description: string; competitionId: string },
  teamId: string,
  user: User
): Promise<Project> => {
  // Validate team exists
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error("Team not found");
  const team = mapDoc<Team>(teamSnap);

  const newProject: any = {
    title: projectData.title,
    description: projectData.description,
    teamName: team.name,
    studentId: user.id,
    competitionId: projectData.competitionId,
    phase: ProjectPhase.DESIGN,
    score: 0,
    lastUpdated: new Date().toISOString() // Use string for serializability
  };

  const docRef = await addDoc(collection(db, 'projects'), newProject);
  const projectWithId = { ...newProject, id: docRef.id } as Project;
  await updateDoc(docRef, { id: docRef.id });

  // Update Team
  const updatedProjectIds = [...(team.projectIds || []), docRef.id];
  await updateDoc(teamRef, { projectIds: updatedProjectIds });

  await logActivity(user, 'PROJECT_CREATE', `Created project "${newProject.title}" for team ${team.name}`, 'success');
  return projectWithId;
};

// --- USER MANAGEMENT MUTATIONS ---

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, data, { merge: true });
  
  // Update local session
  const currentSession = localStorage.getItem('cc_session');
  if (currentSession) {
    const sessionUser = JSON.parse(currentSession);
    if (sessionUser.id === uid) {
      localStorage.setItem('cc_session', JSON.stringify({ ...sessionUser, ...data }));
    }
  }
};

export const deleteUserAccount = async (uid: string) => {
  await deleteDoc(doc(db, 'users', uid));
  if (auth.currentUser && auth.currentUser.uid === uid) {
      await deleteUser(auth.currentUser);
  }
  localStorage.removeItem('cc_session');
};

export const approveUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { status: 'Active' });
  // Log skipped for simplicity, but good to add
};

export const rejectUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { status: 'Rejected' });
};

export const addCollege = async (details: Partial<Omit<College, 'id' | 'status' | 'createdAt'>>, customId?: string, logoFile?: File): Promise<College> => {
  const colRef = collection(db, 'colleges');
  let docRef;
  
  // 1. Determine Document ID First
  if (customId && customId.trim()) {
     docRef = doc(colRef, customId.trim());
  } else {
     docRef = doc(colRef);
  }

  // 2. Handle File Upload (Sync file information)
  let logoUrl = '';
  let logoFileName = '';

  if (logoFile) {
     try {
       const upload = await uploadImage(logoFile, `colleges/${docRef.id}/${logoFile.name}`);
       logoUrl = upload.url;
       logoFileName = logoFile.name;
     } catch (e) {
       console.error("Logo upload failed", e);
       // Continue creating college even if logo fails
     }
  }

  const newCollege: any = {
    name: details.name || 'Unnamed Institution',
    emailId: details.emailId || '',
    website: details.website || '',
    address: details.address || '',
    contactPhone: details.contactPhone || '',
    logoUrl,
    logoFileName,
    status: 'Active',
    createdAt: new Date().toISOString(),
    id: docRef.id // Ensure ID is in document
  };

  // 3. Save to Firestore
  await setDoc(docRef, newCollege);

  await logActivity(null, 'COLLEGE_ADD', `Added new institution: ${newCollege.name}`, 'success');
  return newCollege as College;
};

export const updateCollegeStatus = async (id: string, status: 'Active' | 'Suspended'): Promise<void> => {
  await updateDoc(doc(db, 'colleges', id), { status });
};

export const removeCollege = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'colleges', id));
};

export const resetDatabase = () => {
  localStorage.clear();
  window.location.reload();
};