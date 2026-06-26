import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

export function initFirebase(config: FirebaseConfig): { app: FirebaseApp | null; db: Database | null } {
  try {
    if (getApps().length === 0) {
      _app = initializeApp(config);
    } else {
      _app = getApps()[0];
    }
    _db = getDatabase(_app);
    return { app: _app, db: _db };
  } catch (e) {
    console.warn('Firebase init failed:', e);
    return { app: null, db: null };
  }
}

export function getDb(): Database | null {
  return _db;
}
