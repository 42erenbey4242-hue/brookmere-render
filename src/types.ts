export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'citizen';
  createdAt: number;
  lastNameChangeAt: number | null;
  lastAccountSwitchAt: number | null;
  isBanned: boolean;
  banReason?: string;
  timeoutUntil?: number | null;
  online: boolean;
  lastSeen: number;
}

export interface Session {
  userId: string;
  deviceId: string;
  createdAt: number;
}

export interface Server {
  id: string;
  name: string;
  icon: string | null;
  iconType?: string;
  createdAt: number;
  createdBy: string;
}

export interface Category {
  id: string;
  serverId: string;
  name: string;
  order: number;
}

export interface Channel {
  id: string;
  serverId: string;
  categoryId: string | null;
  name: string;
  order: number;
  permission: 'everyone' | 'admin_only';
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
}

export interface AppState {
  users: Record<string, User>;
  sessions: Record<string, Session>;
  servers: Record<string, Server>;
  categories: Record<string, Category>;
  channels: Record<string, Channel>;
  messages: Record<string, Message>;
  deviceAccountCooldown: Record<string, number>; // deviceId -> timestamp
}
