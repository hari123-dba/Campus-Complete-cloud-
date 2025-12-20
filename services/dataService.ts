import { Competition, CompetitionStatus, Project, ProjectPhase, Announcement, UserRole, Team, User, College, ActivityLog, TeamMember } from '../types';
import { db, storage, auth } from '../lib/firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, setDoc, Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { deleteUser } from 'firebase/auth';

// --- SEED DATA CONSTANTS ---
const SEED_COLLEGES: College[] = [
  { 
    id: 'kWE1Ir8wlBnv31BdZyDQ', 
    name: 'Campus Complete Demo Univ', 
    emailId: 'campus.edu', 
    website: 'https://demo.campus.edu', 
    address: '123 Innovation Drive, Tech City',
    contactPhone: '555-0199',
    status: 'Active',
    createdAt: '2023-01-15T00:00:00.000Z',
    logoUrl: '',
    logoFileName: ''
  },
  { 
    id: 'H8IFKjuoSkrUtiDlJEFp', 
    name: 'Main Campus University', 
    emailId: 'univ.edu', 
    website: 'https://univ.edu', 
    address: 'Main St, Academic District',
    contactPhone: '555-0500',
    status: 'Active',
    createdAt: new Date().toISOString(),
    logoUrl: '',
    logoFileName: ''
  },
  { 
    id: 'col_2', 
    name: 'Springfield Institute of Tech', 
    emailId: 'springfield.edu', 
    website: 'https://sit.edu',
    address: '742 Evergreen Terrace, Springfield',
    contactPhone: '555-0200',
    status: 'Active',
    createdAt: '2023-03-10T00:00:00.000Z',
    logoUrl: '',
    logoFileName: ''
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
    collegeId: 'kWE1Ir8wlBnv31BdZyDQ', status: 'Active', uniqueId: 'PRN001', phoneNumber: '555-0101', academicBackground: 'PhD in Education' 
  },
  { 
    id: 'u_hod', firstName: 'HOD', lastName: 'Smith', name: 'HOD Smith', 
    email: 'hod@campus.edu', role: UserRole.HOD, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Smith', 
    collegeId: 'kWE1Ir8wlBnv31BdZyDQ', status: 'Active', uniqueId: 'HOD001', phoneNumber: '555-0102', department: 'Computer Science & Engineering', academicBackground: 'M.Tech CSE'
  },
  { 
    id: 'u_lec', firstName: 'Lecturer', lastName: 'Doe', name: 'Lecturer Doe', 
    email: 'lecturer@campus.edu', role: UserRole.LECTURER, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Doe', 
    collegeId: 'kWE1Ir8wlBnv31BdZyDQ', status: 'Active', uniqueId: 'LEC001', phoneNumber: '555-0103', department: 'Computer Science & Engineering', academicBackground: 'B.Tech CSE'
  },
  { 
    id: 'u_stu', firstName: 'Student', lastName: 'User', name: 'Student User', 
    email: 'student@campus.edu', role: UserRole.STUDENT, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student', 
    collegeId: 'kWE1Ir8wlBnv31BdZyDQ', status: 'Active', uniqueId: 'STU001', phoneNumber: '555-0104', department: 'Computer Science & Engineering', academicYear: '4th Year', section: 'A'
  }
];

/**
 * Initializes the database.
 * If offline, it handles the failure gracefully so the app shell still loads.
 */
export const initializeDatabase = async () => {
  try {
    const criticalIds = ['kWE1Ir8wlBnv31BdZyDQ', 'H8IFKjuoSkrUtiDlJEFp'];
    
    // Attempt to check for critical records
    for (const id of criticalIds) {
      const colRef = doc(db, 'colleges', id);
      try {
        const snap = await getDoc(colRef);
        if (!snap.exists()) {
          const seedData = SEED_COLLEGES.find(c => c.id === id);
          if (seedData) {
            console.log(`Seeding Golden Record: ${id}`);
            await setDoc(colRef, seedData);
          }
        }
      } catch (innerError: any) {
        // If we are offline, getDoc will throw if the item isn't in cache.
        // We catch this here so the loop can continue or exit cleanly.
        if (innerError.code === 'unavailable' || innerError.message.includes('offline')) {
          console.warn(`Database initialization: Client is offline. Skipping seeding for ID: ${id}`);
          return; // Stop initialization attempt if network is totally unavailable
        }
        throw innerError;
      }
    }

    const usersRef = collection(db, 'users');
    const userSnapshot = await getDocs(query(usersRef, limit(1)));
    if (userSnapshot.empty) {
      console.log('Seeding initial users and content...');
      const batchPromises = [];
      for (const user of SEED_USERS) {
        batchPromises.push(setDoc(doc(db, 'users', user.id), user));
      }
      for (const col of SEED_COLLEGES) {
        if (!criticalIds.includes(col.id)) {
           batchPromises.push(setDoc(doc(db, 'colleges', col.id), col));
        }
      }
      await Promise.all(batchPromises);
    }
  } catch (error: any) {
    // Only log if it's not a standard offline warning
    if (!error.message?.includes('offline')) {
      console.error("Error initializing database:", error);
    }
  }
};

const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

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
    if (error.code !== 'storage/object-not-found') throw error;
  }
};

export const logActivity = async (actor: User | null, action: string, details: string, type: 'info' | 'success' | 'warning' | 'error' | 'critical' = 'info') => {
  try {
    await addDoc(collection(db, 'logs'), {
      actorId: actor?.id || 'system',
      actorName: actor?.name || 'System',
      action,
      details,
      timestamp: new Date().toISOString(),
      type
    });
  } catch (e) {
    console.error("Failed to log activity", e);
  }
};

export const getColleges = async (): Promise<College[]> => {
  try {
    const collegesRef = collection(db, 'colleges');
    const q = query(collegesRef, where('status', '==', 'Active'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => mapDoc<College>(d));
  } catch (err: any) {
    console.warn("Could not fetch colleges:", err.message);
    return [];
  }
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
    const compSnap = await getDocs(collection(db, 'competitions'));
    const competitions = compSnap.docs.map(d => mapDoc<Competition>(d));

    let announceQuery = role === UserRole.ADMIN 
      ? query(collection(db, 'announcements'))
      : query(collection(db, 'announcements'), where('targetRole', 'in', ['All', role]));
    
    const announceSnap = await getDocs(announceQuery);
    const announcements = announceSnap.docs.map(d => mapDoc<Announcement>(d));

    let projSnap;
    if (role === UserRole.STUDENT) {
      projSnap = await getDocs(query(collection(db, 'projects'), where('studentId', '==', userId)));
    } else {
      projSnap = await getDocs(collection(db, 'projects'));
    }
    const projects = projSnap.docs.map(d => mapDoc<Project>(d));

    return { competitions, projects, announcements };
  } catch (e) {
    return { competitions: [], projects: [], announcements: [] };
  }
};

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const snap = await getDocs(collection(db, 'teams'));
  const allTeams = snap.docs.map(d => mapDoc<Team>(d));
  return allTeams.filter(t => t.members.some(m => m.userId === userId));
};

export const getPendingUsers = async (approver: User): Promise<User[]> => {
  const q = query(collection(db, 'users'), where('status', '==', 'Pending'), limit(100));
  const snap = await getDocs(q);
  const pending = snap.docs.map(d => mapDoc<User>(d));

  if (approver.role === UserRole.ADMIN) return pending.filter(u => u.role === UserRole.PRINCIPAL);
  if (approver.role === UserRole.PRINCIPAL) return pending.filter(u => u.role === UserRole.HOD && u.collegeId === approver.collegeId);
  if (approver.role === UserRole.HOD) return pending.filter(u => u.role === UserRole.LECTURER && u.collegeId === approver.collegeId && u.department === approver.department);
  if (approver.role === UserRole.LECTURER) return pending.filter(u => u.role === UserRole.STUDENT && u.collegeId === approver.collegeId && u.department === approver.department);
  return [];
};

export const createTeam = async (name: string, user: User): Promise<Team> => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const docRef = await addDoc(collection(db, 'teams'), {
    name,
    code,
    members: [{ userId: user.id, name: user.name, role: 'Leader', avatar: user.avatar }],
    projectIds: []
  });
  const team = { id: docRef.id, name, code, members: [{ userId: user.id, name: user.name, role: 'Leader' as const, avatar: user.avatar }], projectIds: [] };
  await updateDoc(docRef, { id: docRef.id });
  return team;
};

export const joinTeam = async (code: string, user: User): Promise<Team> => {
  const snap = await getDocs(query(collection(db, 'teams'), where('code', '==', code.trim())));
  if (snap.empty) throw new Error('Invalid code.');
  const team = mapDoc<Team>(snap.docs[0]);
  if (team.members.some(m => m.userId === user.id)) throw new Error('Already a member.');
  const updatedMembers = [...team.members, { userId: user.id, name: user.name, role: 'Member' as const, avatar: user.avatar }];
  await updateDoc(doc(db, 'teams', team.id), { members: updatedMembers });
  return { ...team, members: updatedMembers };
};

export const createProject = async (data: { title: string, description: string, competitionId: string }, teamId: string, user: User): Promise<Project> => {
  const teamSnap = await getDoc(doc(db, 'teams', teamId));
  if (!teamSnap.exists()) throw new Error("Team not found");
  const team = mapDoc<Team>(teamSnap);
  const newProject = {
    title: data.title,
    description: data.description,
    teamName: team.name,
    studentId: user.id,
    competitionId: data.competitionId,
    phase: ProjectPhase.DESIGN,
    score: 0,
    lastUpdated: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'projects'), newProject);
  await updateDoc(docRef, { id: docRef.id });
  await updateDoc(doc(db, 'teams', teamId), { projectIds: [...(team.projectIds || []), docRef.id] });
  return { ...newProject, id: docRef.id } as Project;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
};

export const deleteUserAccount = async (uid: string) => {
  await deleteDoc(doc(db, 'users', uid));
};

export const approveUser = async (userId: string) => {
  await updateDoc(doc(db, 'users', userId), { status: 'Active' });
};

export const rejectUser = async (userId: string) => {
  await updateDoc(doc(db, 'users', userId), { status: 'Rejected' });
};

export const addCollege = async (details: Partial<College>, customId?: string, logoFile?: File): Promise<College> => {
  const colRef = collection(db, 'colleges');
  const docRef = customId ? doc(colRef, customId.trim()) : doc(colRef);
  
  let logoUrl = '';
  let logoFileName = '';
  if (logoFile) {
     const upload = await uploadImage(logoFile, `colleges/${docRef.id}/${logoFile.name}`);
     logoUrl = upload.url;
     logoFileName = logoFile.name;
  }

  const newCollege: College = {
    id: docRef.id,
    name: details.name || 'Unnamed Institution',
    emailId: details.emailId || '',
    website: details.website || '',
    address: details.address || '',
    contactPhone: details.contactPhone || '',
    status: 'Active',
    createdAt: new Date().toISOString(),
    logoUrl: logoUrl || "",
    logoFileName: logoFileName || ""
  };

  await setDoc(docRef, newCollege);
  await logActivity(null, 'COLLEGE_ADD', `Registered Institution: ${newCollege.name} (ID: ${newCollege.id})`, 'success');
  return newCollege;
};

export const updateCollegeStatus = async (id: string, status: 'Active' | 'Suspended') => {
  await updateDoc(doc(db, 'colleges', id), { status });
};

export const removeCollege = async (id: string) => {
  await deleteDoc(doc(db, 'colleges', id));
};

export const resetDatabase = () => {
  localStorage.clear();
  window.location.reload();
};