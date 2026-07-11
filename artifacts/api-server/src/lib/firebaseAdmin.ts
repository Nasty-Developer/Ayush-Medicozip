import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "./logger";

let app: App | null = null;

export function initFirebaseAdmin(): void {
  if (app || getApps().length > 0) return;

  const projectId = process.env["VITE_FIREBASE_PROJECT_ID"];
  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];

  if (!projectId) {
    logger.warn("VITE_FIREBASE_PROJECT_ID not set — Firebase Admin token verification will not work");
    return;
  }

  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson) as Parameters<typeof cert>[0];
      app = initializeApp({ credential: cert(serviceAccount) });
      logger.info("Firebase Admin initialized with service account");
    } else {
      // projectId-only init; verifyIdToken fetches Google's public JWKS keys at runtime
      app = initializeApp({ projectId });
      logger.warn(
        "Firebase Admin initialized with projectId only (no service account). " +
          "Set FIREBASE_SERVICE_ACCOUNT_JSON for full Admin SDK capabilities."
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to initialize Firebase Admin");
  }
}

/**
 * Returns a Firestore instance for the Admin SDK.
 * Returns null if no service account is configured — projectId-only mode
 * cannot authenticate Firestore writes in production.
 */
export function getFirestoreDb() {
  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!serviceAccountJson || !app) return null;
  try {
    return getFirestore(app);
  } catch {
    return null;
  }
}

export { getAuth };
