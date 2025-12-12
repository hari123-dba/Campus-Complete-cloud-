import { User, UserRole } from '../types';
import { getAllUsers } from './dataService';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadImage } from './dataService';

// Helper to normalize Firebase User to App User
const mapUserDocsToAppUser = (authUser: any, docData: any): any => {
    return {
        id: authUser.uid,
        name: docData.name || authUser.displayName || 'User',
        email: authUser.email,
        role: docData.role || UserRole.STUDENT,
        avatar: docData.avatar || authUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.uid}`,
        status: docData.status || 'Active',
        collegeId: docData.collegeId || 'col_1',
        ...docData
    };
};

// Sync mechanism: Ensure Firestore doc exists
const ensureFirestoreDoc = async (authUser: any, additionalData: any = {}) => {
    const userRef = doc(db, 'users', authUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data();
    } else {
        // Create new doc if missing
        const newUserData = {
            uid: authUser.uid,
            name: authUser.displayName || additionalData.name || authUser.email?.split('@')[0],
            email: authUser.email,
            role: additionalData.role || UserRole.STUDENT,
            avatar: authUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.uid}`,
            createdAt: new Date().toISOString(),
            status: 'Active',
            collegeId: additionalData.collegeId || 'col_1',
            ...additionalData
        };
        await setDoc(userRef, newUserData);
        return newUserData;
    }
};

export const login = async (email: string, role?: UserRole, collegeId?: string): Promise<{ user: User | null; error: string | null }> => {
  // MOCK LOGIN STRATEGY (For Demo Mode)
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = getAllUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      if (collegeId && user.collegeId && user.collegeId !== collegeId && user.role !== UserRole.ADMIN) {
         return { user: null, error: "User belongs to a different institution." };
      }
      localStorage.setItem('cc_session', JSON.stringify(user));
      return { user, error: null };
    }
    return { user: null, error: "User not found in demo database." };
  } catch (e) {
      console.error(e);
      return { user: null, error: "An unexpected error occurred during demo login." };
  }
};

export const firebaseLogin = async (email: string, password: string): Promise<{ user: any | null; error: string | null }> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;

        if (!fbUser.emailVerified) {
            await signOut(auth);
            return { user: null, error: "Email not verified. Please check your inbox." };
        }
        
        // Fetch or Create Firestore Document
        const docData = await ensureFirestoreDoc(fbUser);
        const appUser = mapUserDocsToAppUser(fbUser, docData);
        
        localStorage.setItem('cc_session', JSON.stringify(appUser));
        return { user: appUser, error: null };
    } catch (error: any) {
        console.error("Firebase Login Error:", error.code);
        let errorMessage = "An error occurred";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
            errorMessage = "Password or Email Incorrect";
        } else {
            errorMessage = error.message;
        }
        return { user: null, error: errorMessage };
    }
};

export const signInWithGoogle = async (): Promise<{ user: any | null; error: string | null }> => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        
        // Fetch or Create Firestore Document
        const docData = await ensureFirestoreDoc(fbUser);
        const appUser = mapUserDocsToAppUser(fbUser, docData);

        localStorage.setItem('cc_session', JSON.stringify(appUser));
        return { user: appUser, error: null };

    } catch (error: any) {
        console.error("Google Sign In Error", error);
        return { user: null, error: error.message };
    }
};

export const firebaseSignup = async (email: string, password: string, userData: any, profilePhotoFile?: File | null): Promise<{ user: any | null; error: string | null }> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        // Upload photo if exists
        let photoURL = fbUser.photoURL;
        let photoFileName = null;
        if (profilePhotoFile) {
            try {
                const uploadResult = await uploadImage(profilePhotoFile, `avatars/${fbUser.uid}`);
                photoURL = uploadResult.url;
                photoFileName = profilePhotoFile.name;
            } catch (err) {
                console.error("Photo upload failed during signup", err);
            }
        }

        // Update Auth Profile
        await updateProfile(fbUser, {
            displayName: userData.name,
            photoURL: photoURL
        });

        // Create Firestore Document
        const firestoreData = {
            ...userData,
            photoFileName, // Store filename as requested
            avatar: photoURL,
            email: email, // ensure email is set
            createdAt: new Date().toISOString()
        };
        
        await ensureFirestoreDoc(fbUser, firestoreData);

        // Send Verification Email
        await sendEmailVerification(fbUser);
        await signOut(auth);

        return { user: { ...firestoreData, id: fbUser.uid }, error: null };
    } catch (error: any) {
        console.error("Firebase Signup Error:", error.code);
        let errorMessage = "Registration failed";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "User already exists. Sign in?";
        } else {
            errorMessage = error.message;
        }
        return { user: null, error: errorMessage };
    }
};

export const sendPasswordReset = async (email: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Reset Password Error:", error.code);
        let errorMessage = "Failed to send reset email.";
        if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email address.";
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = "User not found.";
        }
        return { success: false, error: errorMessage };
    }
};

export const logout = async () => {
    try {
        await auth.signOut();
    } catch (e) {
        // Ignore if already signed out
    }
    localStorage.removeItem('cc_session');
};

export const getSession = (): User | null => {
  const session = localStorage.getItem('cc_session');
  return session ? JSON.parse(session) : null;
};