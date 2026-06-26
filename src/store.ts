import { AppState } from './types';
import { ref, onValue, set, get } from 'firebase/database';
import { initFirebase } from './firebase';

const LOCAL_KEY = 'brookmere_data';
const CHANNEL = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('brookmere_sync') : null;

// ── Firebase ──────────────────────────────────────────────────────────────────

let firebaseDb: ReturnType<typeof initFirebase>['db'] = null;
let firebaseEnabled = false;
let firebaseListeners: Array<() => void> = [];

// Firebase hazır olduğunda çağrılacak callback'ler
const firebaseReadyCallbacks: Array<() => void> = [];

export function onFirebaseReady(cb: () => void) {
  if (firebaseEnabled && firebaseDb) {
    cb();
  } else {
    firebaseReadyCallbacks.push(cb);
  }
}

export function setupFirebase(config: {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}) {
  try {
    const { db } = initFirebase(config);
    if (db) {
      firebaseDb = db;
      firebaseEnabled = true;
      // Bekleyen callback'leri çalıştır
      firebaseReadyCallbacks.forEach(cb => cb());
      firebaseReadyCallbacks.length = 0;
      return true;
    }
  } catch (e) {
    console.warn('Firebase setup failed:', e);
  }
  return false;
}

export function isFirebaseEnabled() {
  return firebaseEnabled && firebaseDb !== null;
}

// ── Password hashing ──────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  let hash = 0;
  const str = password + '_brookmere_salt_v2';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ── Default state ─────────────────────────────────────────────────────────────

function getDefaultState(): AppState {
  const adminId = 'admin_user_brookmere';
  return {
    users: {
      [adminId]: {
        id: adminId,
        username: 'Admin',
        passwordHash: hashPassword('6668'),
        role: 'admin',
        createdAt: 1704067200000,
        lastNameChangeAt: null,
        lastAccountSwitchAt: null,
        isBanned: false,
        online: false,
        lastSeen: Date.now(),
      }
    },
    sessions: {},
    servers: {},
    categories: {},
    channels: {},
    messages: {},
    deviceAccountCooldown: {},
  };
}

function ensureAdminExists(s: AppState): AppState {
  const adminId = 'admin_user_brookmere';
  if (!s.users) s.users = {};
  if (!s.users[adminId]) {
    s.users[adminId] = getDefaultState().users[adminId];
  } else {
    s.users[adminId].passwordHash = hashPassword('6668');
    s.users[adminId].role = 'admin';
  }
  if (!s.servers) s.servers = {};
  if (!s.categories) s.categories = {};
  if (!s.channels) s.channels = {};
  if (!s.messages) s.messages = {};
  if (!s.sessions) s.sessions = {};
  if (!s.deviceAccountCooldown) s.deviceAccountCooldown = {};
  return s;
}

// ── Local state ───────────────────────────────────────────────────────────────

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      const s = getDefaultState();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
      return s;
    }
    const s = JSON.parse(raw) as AppState;
    return ensureAdminExists(s);
  } catch {
    const s = getDefaultState();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
    return s;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    CHANNEL?.postMessage({ type: 'STATE_UPDATE', state });
    if (firebaseEnabled && firebaseDb) {
      syncToFirebase(state);
    }
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

// ── Firebase sync ─────────────────────────────────────────────────────────────

function syncToFirebase(state: AppState) {
  if (!firebaseDb) return;
  try {
    const dbRef = ref(firebaseDb as Parameters<typeof ref>[0], 'brookmere');
    set(dbRef, state).catch(e => console.warn('Firebase write failed:', e));
  } catch (e) {
    console.warn('Firebase sync error:', e);
  }
}

export async function loadFromFirebase(): Promise<AppState | null> {
  if (!firebaseDb) return null;
  try {
    const dbRef = ref(firebaseDb as Parameters<typeof ref>[0], 'brookmere');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      const data = ensureAdminExists(snapshot.val() as AppState);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
      return data;
    }
    // Firebase boş — local state'i Firebase'e yaz
    const localState = loadState();
    await syncToFirebase(localState);
    return localState;
  } catch (e) {
    console.warn('Firebase load failed:', e);
    return null;
  }
}

export function subscribeToFirebase(callback: (state: AppState) => void): () => void {
  if (!firebaseDb) return () => {};
  try {
    const dbRef = ref(firebaseDb as Parameters<typeof ref>[0], 'brookmere');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = ensureAdminExists(snapshot.val() as AppState);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
        callback(data);
      }
    }, (error) => {
      console.warn('Firebase subscription error:', error);
    });
    firebaseListeners.push(unsubscribe);
    return unsubscribe;
  } catch (e) {
    console.warn('Firebase subscribe failed:', e);
    return () => {};
  }
}

// ── Cross-tab sync ────────────────────────────────────────────────────────────

export function onStateChange(callback: (state: AppState) => void): () => void {
  if (!CHANNEL) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'STATE_UPDATE') {
      callback(event.data.state as AppState);
    }
  };
  CHANNEL.addEventListener('message', handler);
  return () => CHANNEL.removeEventListener('message', handler);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('brookmere_device_id');
  if (!deviceId) {
    deviceId = 'device_' + generateId();
    localStorage.setItem('brookmere_device_id', deviceId);
  }
  return deviceId;
}

export function getCurrentSessionKey(): string {
  return 'brookmere_session_' + getDeviceId();
}

export function getStoredSession(): string | null {
  return localStorage.getItem(getCurrentSessionKey());
}

export function storeSession(userId: string): void {
  localStorage.setItem(getCurrentSessionKey(), userId);
}

export function clearSession(): void {
  localStorage.removeItem(getCurrentSessionKey());
}
