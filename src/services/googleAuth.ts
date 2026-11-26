import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely (prevent duplicate initialization)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

// Standard Google Login provider for Portal Users (Students, Parents, Admin) — no Drive permissions requested
const portalProvider = new GoogleAuthProvider();
portalProvider.setCustomParameters({ prompt: 'select_account' });

// Extended Google Drive/Sheets provider (used only by Admin in Google Sheets DB tab)
const sheetsProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => sheetsProvider.addScope(scope));
sheetsProvider.setCustomParameters({ prompt: 'consent select_account' });

// In-memory access token cache for Google Sheets API (DO NOT store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

/**
 * Subscribe to Firebase Authentication state changes for the portal.
 */
export const subscribeAuth = (onUserChange: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      cachedAccessToken = null;
    }
    onUserChange(user);
  });
};

/**
 * Sign in to the portal with Google (clean profile + verified email only, no Drive scope).
 */
export const portalGoogleSignIn = async (): Promise<User> => {
  const result = await signInWithPopup(auth, portalProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken && !cachedAccessToken) {
    // Only cache Drive token when sheets scope was granted; portal sign-in has no Drive scope
  }
  return result.user;
};

/**
 * Legacy / Google Sheets OAuth Sign-In: requests Google Drive `drive.file` scope for spreadsheet sync.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const result = await signInWithPopup(auth, sheetsProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to get access token from Google authentication');
  }
  cachedAccessToken = credential.accessToken;
  return { user: result.user, accessToken: cachedAccessToken };
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
