import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
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

const EXPECTED_FIREBASE_PROJECT_ID = "ayush-medico";

function isValidEnv(v: string | undefined): boolean {
  return !!v && v !== "undefined" && v !== "null" && v.length > 0;
}

export const firebaseConfigurationError = !isValidEnv(firebaseConfig.apiKey) ||
  !isValidEnv(firebaseConfig.authDomain) ||
  !isValidEnv(firebaseConfig.projectId) ||
  !isValidEnv(firebaseConfig.storageBucket) ||
  !isValidEnv(firebaseConfig.messagingSenderId) ||
  !isValidEnv(firebaseConfig.appId)
  ? "Firebase configuration is incomplete. Please contact support."
  : firebaseConfig.projectId !== EXPECTED_FIREBASE_PROJECT_ID
    ? "This site is connected to the wrong Firebase project."
    : null;

export const isFirebaseConfigured = firebaseConfigurationError === null;

export const firebaseProjectId = firebaseConfig.projectId;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | undefined;

if (isFirebaseConfigured) {
  const existingApp = getApps().find((candidate) => candidate.options.projectId === firebaseConfig.projectId);
  app = existingApp ?? initializeApp(firebaseConfig, "ayush-medico");
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

export { app, auth, storage, analytics };
