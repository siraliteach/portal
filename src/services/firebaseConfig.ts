import appletConfig from '../../firebase-applet-config.json';

export interface ActiveFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const PORTAL_EXTERNAL_FIREBASE_CONFIG: ActiveFirebaseConfig = {
  apiKey: 'AIzaSyDJPKlaW2HWELzXadgfrU9w-eDwuCb4LGM',
  authDomain: 'portal-f3e82.firebaseapp.com',
  projectId: 'portal-f3e82',
  storageBucket: 'portal-f3e82.firebasestorage.app',
  messagingSenderId: '258038339971',
  appId: '1:258038339971:web:013814f0b27b239783feb6',
  measurementId: 'G-YH8XT40QWH',
  firestoreDatabaseId: '',
};

function isAiStudioRuntimeHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('.run.app') || host === 'localhost' || host === '127.0.0.1';
}

export const activeFirebaseConfig: ActiveFirebaseConfig = isAiStudioRuntimeHost()
  ? appletConfig
  : PORTAL_EXTERNAL_FIREBASE_CONFIG;
