import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "./logger.js";
let app = null;
let hasServiceAccountCredentials = false;
let initializationError = null;
function firstConfigured(...values) {
    return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}
function normalizePrivateKey(privateKey) {
    return privateKey.replace(/\\n/g, "\n");
}
export function initFirebaseAdmin() {
    if (app || getApps().length > 0)
        return;
    // Render/server deployments should use server-only names. Keep the VITE_
    // fallback for the existing Replit environment, where the project ID is
    // already configured as a shared public variable.
    const projectId = firstConfigured(process.env["FIREBASE_PROJECT_ID"], process.env["VITE_FIREBASE_PROJECT_ID"]);
    const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
    if (!projectId && !serviceAccountJson) {
        initializationError = "Firebase Admin project ID or service account credentials are not configured";
        logger.error(initializationError);
        return;
    }
    try {
        if (serviceAccountJson) {
            const serviceAccount = JSON.parse(serviceAccountJson);
            if (typeof serviceAccount.private_key === "string") {
                serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
            }
            app = initializeApp({ credential: cert(serviceAccount) });
            hasServiceAccountCredentials = true;
            logger.info("Firebase Admin initialized with service account");
        }
        else {
            const clientEmail = firstConfigured(process.env["FIREBASE_CLIENT_EMAIL"]);
            const privateKey = firstConfigured(process.env["FIREBASE_PRIVATE_KEY"]);
            if (clientEmail && privateKey && projectId) {
                app = initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey: normalizePrivateKey(privateKey),
                    }),
                    projectId,
                });
                hasServiceAccountCredentials = true;
                logger.info("Firebase Admin initialized with server-side service account variables");
            }
            else if (projectId) {
                // ID-token signature verification only needs the Firebase project ID
                // and Google's public signing keys. Firestore/Admin API operations
                // still require a service account, which is reported separately.
                app = initializeApp({ projectId });
                logger.warn("Firebase Admin initialized with project ID only. " +
                    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY " +
                    "for server-side Firebase Admin API access.");
            }
            else {
                initializationError =
                    "Firebase Admin service account credentials are missing a project ID";
                logger.error(initializationError);
            }
        }
    }
    catch (err) {
        initializationError = "Firebase Admin could not be initialized from the configured credentials";
        logger.error({ err }, "Failed to initialize Firebase Admin");
    }
}
/**
 * Returns a Firestore instance for the Admin SDK.
 * Returns null if no service account is configured — projectId-only mode
 * cannot authenticate Firestore writes in production.
 */
export function getFirestoreDb() {
    if (!hasServiceAccountCredentials || !app)
        return null;
    try {
        return getFirestore(app);
    }
    catch {
        return null;
    }
}
export class FirebaseAdminConfigurationError extends Error {
    code = "firebase_admin_not_configured";
    constructor() {
        super(initializationError ?? "Firebase Admin is not configured");
        this.name = "FirebaseAdminConfigurationError";
    }
}
export function getAuth() {
    if (!app)
        throw new FirebaseAdminConfigurationError();
    return getAdminAuth(app);
}
