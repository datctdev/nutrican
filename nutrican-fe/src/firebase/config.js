import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const FIREBASE_REQUIRED_KEYS = [
  'apiKey', 'authDomain', 'projectId', 'storageBucket',
  'messagingSenderId', 'appId',
];

const isConfigured = FIREBASE_REQUIRED_KEYS.every(
  (key) => Boolean(firebaseConfig[key])
);

let app = null;
let auth = null;
let googleProvider = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
  googleProvider = new GoogleAuthProvider();
}

export const isFirebaseConfigured = isConfigured;
export { auth, googleProvider };

export const signInWithGoogle = async () => {
  if (!isConfigured) {
    throw new Error('Firebase is not configured. Please set Firebase environment variables.');
  }
  const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  const idToken = await result.user.getIdToken();
  return { idToken, user: result.user };
};
