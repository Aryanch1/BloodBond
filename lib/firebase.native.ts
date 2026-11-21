import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from '@firebase/app';
import * as firebaseAuth from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
/**
 * Firebase wiring for BloodBond — native (Android/iOS). Metro picks this
 * file over firebase.ts on native.
 *
 * Native imports the scoped @firebase/* packages on purpose: they ship
 * a real React Native build (the umbrella 'firebase/auth' entry does
 * not — it resolves to the browser build, whose sessions are kept in
 * memory only, so users were signed out every time the app closed).
 *
 * Firebase project bloodbond-5248a, created 2026-11-21. The real web
 * config is wired below and firebaseConfigured is true in lib/config.ts.
 * Email/Password and Google sign-in are enabled, Firestore is created
 * in production mode, and the repo's owner-only firestore.rules are
 * published.
 *
 * The config values below are Firebase's public app identifiers — they
 * are designed to ship in client code. Access is controlled by Firebase
 * Authentication plus the Firestore security rules (each user can only
 * read and write their own /users/<uid> tree). No admin keys or secrets
 * live here; the Gemini key stays server-side in the /api/message
 * (Java backend) service.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyApNqfbYnpHC_H7cluUnN_cETKrbA3fssU',
  authDomain: 'bloodbond-5248a.firebaseapp.com',
  projectId: 'bloodbond-5248a',
  storageBucket: 'bloodbond-5248a.firebasestorage.app',
  messagingSenderId: '67201598483',
  appId: '1:67201598483:web:19f8913ccee0cd52dd2be6',
};

/** OAuth web client ID for the native Google Sign-In flow (not a secret). */
export const GOOGLE_WEB_CLIENT_ID = '67201598483-6m2nh3cd2rf4uco7t7rt4m1oovggtonq.apps.googleusercontent.com';

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth(): firebaseAuth.Auth {
  // Persist the session in AsyncStorage so the user stays signed in
  // between app launches, like every other app.
  const getPersistence = (
    firebaseAuth as unknown as {
      getReactNativePersistence?: (storage: unknown) => firebaseAuth.Persistence;
    }
  ).getReactNativePersistence;
  if (getPersistence) {
    try {
      return firebaseAuth.initializeAuth(firebaseApp, {
        persistence: getPersistence(AsyncStorage),
      });
    } catch {
      // Already initialized (fast refresh) — fall through to getAuth.
    }
  }
  return firebaseAuth.getAuth(firebaseApp);
}

export const auth = createAuth();
export const db = getFirestore(firebaseApp);

export {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  type User,
} from '@firebase/auth';

export {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '@firebase/firestore';
