import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function isValidEnv(v: string | undefined): boolean {
  return !!v && v !== "undefined" && v !== "null" && v.length > 0;
}

export const isFirebaseConfigured =
  isValidEnv(firebaseConfig.apiKey) &&
  isValidEnv(firebaseConfig.authDomain) &&
  isValidEnv(firebaseConfig.projectId) &&
  isValidEnv(firebaseConfig.appId);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | undefined;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

  if (typeof window !== "undefined") {
    isSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId && app) {
        analytics = getAnalytics(app);
      }
    }).catch(() => {});
  }
}

export { app, db, auth, storage, analytics };
