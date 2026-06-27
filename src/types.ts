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
  // Profile fields
  avatarUrl?: string | null;
  avatarIsGif?: boolean;
  bannerUrl?: string | null;
  bannerIsGif?: boolean;
  bio?: string;
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

export interface DirectMessage {
  id: string;
  conversationId: string; // sorted userId1_userId2
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: number;
}

export interface DMConversation {
  id: string; // sorted userId1_userId2
  participants: [string, string];
  lastMessageAt: number;
}

export interface AppState {
  users: Record<string, User>;
  sessions: Record<string, Session>;
  servers: Record<string, Server>;
  categories: Record<string, Category>;
  channels: Record<string, Channel>;
  messages: Record<string, Message>;
  directMessages: Record<string, DirectMessage>;
  dmConversations: Record<string, DMConversation>;
  deviceAccountCooldown: Record<string, number>;
}
