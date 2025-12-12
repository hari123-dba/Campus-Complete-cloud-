// import { initializeApp } from 'firebase/app';
// import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

// Note: In a production environment, use process.env to populate these values.
/*
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", 
  authDomain: "campus-complete.firebaseapp.com",
  projectId: "campus-complete",
  storageBucket: "campus-complete.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
*/

// let app;
let db: any = null;

/*
try {
  // Simple check to see if the user has actually configured the keys
  if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    app = initializeApp(firebaseConfig);
    
    // Initialize Firestore with settings for offline persistence
    db = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });

    // Enable offline persistence
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open.');
      } else if (err.code == 'unimplemented') {
        console.warn('Persistence is not available in this browser.');
      }
    });

    console.log("Firebase initialized successfully with offline persistence");
  } else {
    console.warn("Firebase configuration missing. Running in Offline/Demo mode.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}
*/

console.warn("Firebase integration disabled due to build environment issues. Running in Offline/Demo mode.");

export { db };