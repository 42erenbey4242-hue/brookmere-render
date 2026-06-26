import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, User, Server, Category, Channel, Message } from './types';
import {
  loadState, saveState, onStateChange, generateId,
  getDeviceId, getStoredSession, storeSession, clearSession, hashPassword,
  subscribeToFirebase, isFirebaseEnabled
} from './store';

export function useAppState() {
  const [state, setStateInternal] = useState<AppState>(() => loadState());
  const stateRef = useRef(state);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateInternal(prev => {
      const next = updater(prev);
      stateRef.current = next;
      saveState(next);
      return next;
    });
  }, []);

  // Listen for cross-tab updates (same device)
  useEffect(() => {
    const unsub = onStateChange((newState) => {
      setStateInternal(newState);
      stateRef.current = newState;
    });
    return unsub;
  }, []);

  // Firebase real-time subscription (cross-device)
  useEffect(() => {
    if (!isFirebaseEnabled()) return;
    const unsub = subscribeToFirebase((newState) => {
      setStateInternal(newState);
      stateRef.current = newState;
    });
    return unsub;
  }, []);

  // Heartbeat to keep online status updated
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const userId = currentUserIdRef.current;
      if (!userId) return;
      // Only update if state is stale
      setStateInternal(prev => {
        const user = prev.users[userId];
        if (!user) return prev;
        if (user.online && Date.now() - user.lastSeen < 4000) return prev;
        const next = {
          ...prev,
          users: {
            ...prev.users,
            [userId]: { ...user, online: true, lastSeen: Date.now() }
          }
        };
        stateRef.current = next;
        saveState(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mark offline on unload
  useEffect(() => {
    const handleUnload = () => {
      const userId = currentUserIdRef.current;
      if (!userId) return;
      const s = { ...stateRef.current };
      if (s.users[userId]) {
        s.users = { ...s.users, [userId]: { ...s.users[userId], online: false, lastSeen: Date.now() } };
        localStorage.setItem('brookmere_data', JSON.stringify(s));
        // Try Firebase sync synchronously
        if (isFirebaseEnabled()) {
          saveState(s);
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Check online status of other users (mark offline if no heartbeat)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setStateInternal(prev => {
        let changed = false;
        const newUsers = { ...prev.users };
        Object.values(newUsers).forEach(user => {
          if (user.id === currentUserIdRef.current) return;
          if (user.online && now - user.lastSeen > 15000) {
            newUsers[user.id] = { ...user, online: false };
            changed = true;
          }
        });
        if (!changed) return prev;
        const next = { ...prev, users: newUsers };
        stateRef.current = next;
        saveState(next);
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const getCurrentUser = useCallback((): User | null => {
    const uid = getStoredSession();
    if (!uid) return null;
    return stateRef.current.users[uid] || null;
  }, []);

  const register = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const s = loadState();
    const deviceId = getDeviceId();

    // Check device account cooldown
    const cooldownTs = s.deviceAccountCooldown[deviceId];
    if (cooldownTs) {
      const diff = Date.now() - cooldownTs;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (diff < thirtyDays) {
        const remaining = Math.ceil((thirtyDays - diff) / (24 * 60 * 60 * 1000));
        return { success: false, error: `Hesap değiştirme bekleme süresi: ${remaining} gün kaldı.` };
      }
    }

    if (!username.trim() || username.trim().length < 2) {
      return { success: false, error: 'İsim en az 2 karakter olmalıdır.' };
    }
    if (username.trim().length > 32) {
      return { success: false, error: 'İsim en fazla 32 karakter olabilir.' };
    }

    const userId = 'user_' + generateId();
    const newUser: User = {
      id: userId,
      username: username.trim(),
      passwordHash: hashPassword(password),
      role: 'citizen',
      createdAt: Date.now(),
      lastNameChangeAt: null,
      lastAccountSwitchAt: null,
      isBanned: false,
      online: true,
      lastSeen: Date.now(),
    };

    s.users[userId] = newUser;
    saveState(s);
    setStateInternal({ ...s });
    stateRef.current = { ...s };

    storeSession(userId);
    currentUserIdRef.current = userId;
    return { success: true };
  }, []);

  const loginAdmin = useCallback((username: string, password: string): { success: boolean; error?: string } => {
    const s = loadState();
    const adminId = 'admin_user_brookmere';
    const admin = s.users[adminId];
    if (!admin) return { success: false, error: 'Admin bulunamadı.' };
    if (admin.username.toLowerCase() !== username.toLowerCase()) return { success: false, error: 'Hatalı kullanıcı adı.' };
    if (admin.passwordHash !== hashPassword(password)) return { success: false, error: 'Hatalı şifre.' };

    admin.online = true;
    admin.lastSeen = Date.now();
    s.users[adminId] = admin;
    saveState(s);
    setStateInternal({ ...s });
    stateRef.current = { ...s };

    storeSession(adminId);
    currentUserIdRef.current = adminId;
    return { success: true };
  }, []);

  const autoLogin = useCallback((): boolean => {
    const uid = getStoredSession();
    if (!uid) return false;
    const s = loadState();
    const user = s.users[uid];
    if (!user) {
      clearSession();
      return false;
    }
    if (user.isBanned) {
      clearSession();
      return false;
    }
    user.online = true;
    user.lastSeen = Date.now();
    s.users[uid] = user;
    saveState(s);
    setStateInternal({ ...s });
    stateRef.current = { ...s };
    currentUserIdRef.current = uid;
    return true;
  }, []);

  const logout = useCallback((deleteAccount: boolean = false) => {
    const uid = getStoredSession();
    if (!uid) return;
    const s = loadState();
    if (s.users[uid]) {
      s.users[uid].online = false;
      s.users[uid].lastSeen = Date.now();
      if (deleteAccount) {
        const deviceId = getDeviceId();
        s.deviceAccountCooldown[deviceId] = Date.now();
      }
    }
    saveState(s);
    setStateInternal({ ...s });
    stateRef.current = { ...s };
    clearSession();
    currentUserIdRef.current = null;
  }, []);

  const markOnline = useCallback((userId: string) => {
    currentUserIdRef.current = userId;
  }, []);

  // ── Users ─────────────────────────────────────────────────────────────────

  const changeName = useCallback((userId: string, newName: string): { success: boolean; error?: string } => {
    const s = loadState();
    const user = s.users[userId];
    if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };

    if (user.role !== 'admin' && user.lastNameChangeAt) {
      const diff = Date.now() - user.lastNameChangeAt;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (diff < thirtyDays) {
        const remaining = Math.ceil((thirtyDays - diff) / (24 * 60 * 60 * 1000));
        return { success: false, error: `İsim değiştirme hakkı ${remaining} gün sonra kullanılabilir.` };
      }
    }

    if (!newName.trim() || newName.trim().length < 2) {
      return { success: false, error: 'İsim en az 2 karakter olmalıdır.' };
    }

    s.users[userId].username = newName.trim();
    if (user.role !== 'admin') {
      s.users[userId].lastNameChangeAt = Date.now();
    }
    saveState(s);
    setStateInternal({ ...s });
    stateRef.current = { ...s };
    return { success: true };
  }, []);

  const banUser = useCallback((userId: string, reason?: string) => {
    setState(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [userId]: { ...prev.users[userId], isBanned: true, banReason: reason || 'Admin tarafından banlandı.' }
      }
    }));
  }, [setState]);

  const unbanUser = useCallback((userId: string) => {
    setState(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [userId]: { ...prev.users[userId], isBanned: false, banReason: undefined }
      }
    }));
  }, [setState]);

  const timeoutUser = useCallback((userId: string, minutes: number) => {
    setState(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [userId]: { ...prev.users[userId], timeoutUntil: Date.now() + minutes * 60 * 1000 }
      }
    }));
  }, [setState]);

  const removeTimeout = useCallback((userId: string) => {
    setState(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [userId]: { ...prev.users[userId], timeoutUntil: null }
      }
    }));
  }, [setState]);

  // ── Servers ───────────────────────────────────────────────────────────────

  const createServer = useCallback((name: string): Server => {
    const server: Server = {
      id: 'server_' + generateId(),
      name,
      icon: null,
      createdAt: Date.now(),
      createdBy: 'admin_user_brookmere',
    };
    setState(prev => ({
      ...prev,
      servers: { ...prev.servers, [server.id]: server }
    }));
    return server;
  }, [setState]);

  const updateServer = useCallback((serverId: string, updates: Partial<Server>) => {
    setState(prev => ({
      ...prev,
      servers: {
        ...prev.servers,
        [serverId]: { ...prev.servers[serverId], ...updates }
      }
    }));
  }, [setState]);

  const deleteServer = useCallback((serverId: string) => {
    setState(prev => {
      const newServers = { ...prev.servers };
      delete newServers[serverId];
      const newChannels = Object.fromEntries(
        Object.entries(prev.channels).filter(([, c]) => c.serverId !== serverId)
      );
      const newCategories = Object.fromEntries(
        Object.entries(prev.categories).filter(([, c]) => c.serverId !== serverId)
      );
      return { ...prev, servers: newServers, channels: newChannels, categories: newCategories };
    });
  }, [setState]);

  // ── Categories ────────────────────────────────────────────────────────────

  const createCategory = useCallback((serverId: string, name: string): Category => {
    const s = loadState();
    const existingOrders = Object.values(s.categories)
      .filter(c => c.serverId === serverId)
      .map(c => c.order);
    const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

    const category: Category = {
      id: 'cat_' + generateId(),
      serverId,
      name,
      order: maxOrder + 1,
    };
    setState(prev => ({
      ...prev,
      categories: { ...prev.categories, [category.id]: category }
    }));
    return category;
  }, [setState]);

  const updateCategory = useCallback((categoryId: string, updates: Partial<Category>) => {
    setState(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryId]: { ...prev.categories[categoryId], ...updates }
      }
    }));
  }, [setState]);

  const deleteCategory = useCallback((categoryId: string) => {
    setState(prev => {
      const newCategories = { ...prev.categories };
      delete newCategories[categoryId];
      const newChannels = { ...prev.channels };
      Object.values(newChannels).forEach(ch => {
        if (ch.categoryId === categoryId) {
          newChannels[ch.id] = { ...ch, categoryId: null };
        }
      });
      return { ...prev, categories: newCategories, channels: newChannels };
    });
  }, [setState]);

  // ── Channels ──────────────────────────────────────────────────────────────

  const createChannel = useCallback((serverId: string, categoryId: string | null, name: string): Channel => {
    const s = loadState();
    const existingOrders = Object.values(s.channels)
      .filter(c => c.serverId === serverId)
      .map(c => c.order);
    const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

    const channel: Channel = {
      id: 'ch_' + generateId(),
      serverId,
      categoryId,
      name,
      order: maxOrder + 1,
      permission: 'everyone',
    };
    setState(prev => ({
      ...prev,
      channels: { ...prev.channels, [channel.id]: channel }
    }));
    return channel;
  }, [setState]);

  const updateChannel = useCallback((channelId: string, updates: Partial<Channel>) => {
    setState(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelId]: { ...prev.channels[channelId], ...updates }
      }
    }));
  }, [setState]);

  const updateChannels = useCallback((updates: Array<{ id: string; changes: Partial<Channel> }>) => {
    setState(prev => {
      const newChannels = { ...prev.channels };
      updates.forEach(({ id, changes }) => {
        if (newChannels[id]) {
          newChannels[id] = { ...newChannels[id], ...changes };
        }
      });
      return { ...prev, channels: newChannels };
    });
  }, [setState]);

  const deleteChannel = useCallback((channelId: string) => {
    setState(prev => {
      const newChannels = { ...prev.channels };
      delete newChannels[channelId];
      return { ...prev, channels: newChannels };
    });
  }, [setState]);

  // ── Messages ──────────────────────────────────────────────────────────────

  const sendMessage = useCallback((channelId: string, userId: string, username: string, content: string): { success: boolean; error?: string } => {
    const s = loadState();
    const user = s.users[userId];
    const channel = s.channels[channelId];

    if (!user || !channel) return { success: false, error: 'Hata.' };
    if (user.isBanned) return { success: false, error: 'Banlandınız.' };
    if (user.timeoutUntil && Date.now() < user.timeoutUntil) {
      const remaining = Math.ceil((user.timeoutUntil - Date.now()) / 60000);
      return { success: false, error: `Susturuldunuz. ${remaining} dakika kaldı.` };
    }
    if (channel.permission === 'admin_only' && user.role !== 'admin') {
      return { success: false, error: 'Bu kanalda mesaj gönderme izniniz yok.' };
    }

    const message: Message = {
      id: 'msg_' + generateId(),
      channelId,
      userId,
      username,
      content: content.trim(),
      createdAt: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: { ...prev.messages, [message.id]: message }
    }));
    return { success: true };
  }, [setState]);

  return {
    state,
    setState,
    getCurrentUser,
    register,
    loginAdmin,
    autoLogin,
    logout,
    markOnline,
    changeName,
    banUser,
    unbanUser,
    timeoutUser,
    removeTimeout,
    createServer,
    updateServer,
    deleteServer,
    createCategory,
    updateCategory,
    deleteCategory,
    createChannel,
    updateChannel,
    updateChannels,
    deleteChannel,
    sendMessage,
  };
}
