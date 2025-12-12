export enum UserRole {
  ADMIN = 'Administrator',
  PRINCIPAL = 'Principal',
  HOD = 'HOD',
  LECTURER = 'Lecturer',
  STUDENT = 'Student'
}

export enum CompetitionStatus {
  DRAFT = 'Draft',
  UPCOMING = 'Upcoming',
  ONGOING = 'Ongoing',
  EVALUATION = 'Evaluation',
  COMPLETED = 'Completed'
}

export enum ProjectPhase {
  DESIGN = 'Design',
  DEVELOPMENT = 'Development',
  TESTING = 'Testing',
  IMPLEMENTATION = 'Implementation'
}

export type UserStatus = 'Active' | 'Pending' | 'Rejected';

export interface College {
  id: string;
  name: string;
  emailId: string; // The official college email identifier/domain
  website: string;
  address: string;
  contactPhone: string;
  status: 'Active' | 'Suspended';
  createdAt: string; // ISO String timestamp of when the college was added
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Display name (computed)
  email: string;
  role: UserRole;
  avatar: string;
  collegeId?: string; // Made optional for System Admins
  status: UserStatus;
  
  // Extended Profile Fields
  uniqueId: string;
  phoneNumber: string;
  
  // Role Specific Optional Fields
  department?: string;        // HOD, Lecturer, Student
  academicBackground?: string;// Principal, HOD, Lecturer (Info Dialog)
  academicYear?: string;      // Student
  section?: string;           // Student
}

export interface TeamMember {
  userId: string;
  name: string;
  role: 'Leader' | 'Member';
  avatar: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  members: TeamMember[];
  projectIds: string[];
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  status: CompetitionStatus;
  date: string;
  participants: number;
  bannerUrl: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  teamName: string;
  studentId: string;
  competitionId: string;
  phase: ProjectPhase;
  score: number;
  lastUpdated: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRole: UserRole | 'All';
  date: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  timestamp: string; // ISO String
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  // Enhanced monitoring fields
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}