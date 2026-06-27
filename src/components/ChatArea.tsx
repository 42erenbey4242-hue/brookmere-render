import React, { useState, useEffect, useRef } from 'react';
import { Channel, Message, User } from '../types';
import ProfileCard from './ProfileCard';

interface Props {
  channel: Channel | null;
  messages: Message[];
  currentUser: User;
  users: Record<string, User>;
  onSend: (content: string) => { success: boolean; error?: string };
  onOpenDM: (userId: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Bugün ${timeStr}`;
  if (isYesterday) return `Dün ${timeStr}`;
  return d.toLocaleDateString('tr-TR') + ' ' + timeStr;
}

function formatFullTime(ts: number): string {
  return new Date(ts).toLocaleString('tr-TR');
}

export default function ChatArea({ channel, messages, currentUser, users, onSend, onOpenDM }: Props) {
  const [profileCard, setProfileCard] = useState<{ user: User; x: number; y: number } | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setError('');
  }, [channel]);

  const handleSend = () => {
    if (!input.trim() || !channel) return;
    const result = onSend(input.trim());
    if (result.success) {
      setInput('');
      setError('');
    } else {
      setError(result.error || 'Hata.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = channel &&
    (channel.permission === 'everyone' || currentUser.role === 'admin') &&
    !currentUser.isBanned &&
    !(currentUser.timeoutUntil && Date.now() < currentUser.timeoutUntil);

  const getTimeoutRemaining = () => {
    if (!currentUser.timeoutUntil) return null;
    const remaining = currentUser.timeoutUntil - Date.now();
    if (remaining <= 0) return null;
    const mins = Math.ceil(remaining / 60000);
    return mins;
  };

  // Group messages by user+time proximity
  const groupedMessages: Array<{ messages: Message[]; isFirst: boolean }> = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const isSameUser = prev && prev.userId === msg.userId && msg.createdAt - prev.createdAt < 5 * 60 * 1000;
    if (isSameUser) {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    } else {
      groupedMessages.push({ messages: [msg], isFirst: true });
    }
  });

  if (!channel) {
    return (
      <div className="flex-1 bg-[#313338] flex items-center justify-center">
        <div className="text-center text-[#949ba4]">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-xl font-semibold text-white">Kanal Seçin</p>
          <p className="text-sm mt-1">Sol taraftan bir kanal seçerek sohbete başlayın.</p>
        </div>
      </div>
    );
  }

  const timeoutMins = getTimeoutRemaining();

  return (
    <div className="flex-1 bg-[#313338] flex flex-col min-w-0">
      {profileCard && (
        <ProfileCard
          user={profileCard.user}
          onClose={() => setProfileCard(null)}
          onSendDM={profileCard.user.id !== currentUser.id ? (uid) => { onOpenDM(uid); setProfileCard(null); } : undefined}
          anchorEl={{ x: profileCard.x, y: profileCard.y }}
        />
      )}
      {/* Channel header */}
      <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1e1f22] shrink-0 shadow-sm">
        <svg className="w-5 h-5 text-[#80848e] shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.18 17.44a.75.75 0 0 1-1.06 1.12l-.6-.56A2.75 2.75 0 0 1 7.75 16V9.75a.75.75 0 0 1 1.5 0V16c0 .32.12.63.34.86l.59.58Zm3.64 0 .59-.58c.22-.23.34-.54.34-.86V9.75a.75.75 0 0 1 1.5 0V16a2.75 2.75 0 0 1-.77 1.9l-.6.56a.75.75 0 0 1-1.06-1.12v.1Zm-4.68-9.19a.75.75 0 1 1 0-1.5h5.72a.75.75 0 0 1 0 1.5H9.14ZM5.5 8a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h.25a.75.75 0 0 1 0 1.5H5.5A2 2 0 0 1 3.5 15.5v-7A2 2 0 0 1 5.5 6.5h.25a.75.75 0 0 1 0 1.5H5.5Zm13 0h-.25a.75.75 0 0 1 0-1.5h.25a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-.25a.75.75 0 0 1 0-1.5h.25a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5Z"/>
        </svg>
        <span className="text-white font-semibold">{channel.name}</span>
        {channel.permission === 'admin_only' && (
          <span className="text-xs bg-[#f5a623]/20 text-[#f5a623] px-2 py-0.5 rounded-full border border-[#f5a623]/30 font-medium">
            🔒 Sadece Admin Yazabilir
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-start mb-4">
            <div className="w-16 h-16 rounded-full bg-[#5865f2] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.18 17.44a.75.75 0 0 1-1.06 1.12l-.6-.56A2.75 2.75 0 0 1 7.75 16V9.75a.75.75 0 0 1 1.5 0V16c0 .32.12.63.34.86l.59.58Zm3.64 0 .59-.58c.22-.23.34-.54.34-.86V9.75a.75.75 0 0 1 1.5 0V16a2.75 2.75 0 0 1-.77 1.9l-.6.56a.75.75 0 0 1-1.06-1.12v.1Zm-4.68-9.19a.75.75 0 1 1 0-1.5h5.72a.75.75 0 0 1 0 1.5H9.14ZM5.5 8a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h.25a.75.75 0 0 1 0 1.5H5.5A2 2 0 0 1 3.5 15.5v-7A2 2 0 0 1 5.5 6.5h.25a.75.75 0 0 1 0 1.5H5.5Zm13 0h-.25a.75.75 0 0 1 0-1.5h.25a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-.25a.75.75 0 0 1 0-1.5h.25a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5Z"/>
              </svg>
            </div>
            <h3 className="text-white text-2xl font-bold">#{channel.name}'e hoş geldiniz!</h3>
            <p className="text-[#949ba4] text-sm mt-1">Bu kanalın başlangıcı. Konuşmaya başlayın!</p>
          </div>
        )}

        {groupedMessages.map((group, groupIdx) => {
          const firstMsg = group.messages[0];
          const sender = users[firstMsg.userId];
          const isAdmin = sender?.role === 'admin';
          const displayName = sender?.username || firstMsg.username;

          return (
            <div key={groupIdx} className="group hover:bg-[#2e3035] px-2 py-0.5 rounded -mx-2">
              <div className="flex gap-4">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-0.5 cursor-pointer"
                  onClick={(e) => sender && setProfileCard({ user: sender, x: e.clientX, y: e.clientY })}
                >
                  {sender?.avatarUrl ? (
                    <img src={sender.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-sm font-bold ${isAdmin ? 'bg-[#f5a623]' : 'bg-[#5865f2]'}`}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span
                      className={`font-semibold text-sm cursor-pointer hover:underline ${isAdmin ? 'text-[#f5a623]' : 'text-white'}`}
                      onClick={(e) => sender && setProfileCard({ user: sender, x: e.clientX, y: e.clientY })}
                    >
                      {displayName}
                      {isAdmin && ' 👑'}
                    </span>
                    <span className="text-[#949ba4] text-xs">{formatTime(firstMsg.createdAt)}</span>
                  </div>
                  {group.messages.map(msg => (
                    <p key={msg.id} className="text-[#dbdee1] text-sm leading-relaxed break-words" title={formatFullTime(msg.createdAt)}>
                      {msg.content}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 shrink-0">
        {currentUser.isBanned ? (
          <div className="bg-[#f23f43]/20 border border-[#f23f43]/40 rounded-lg px-4 py-3 text-[#f23f43] text-sm text-center">
            🔨 Banlandınız. {currentUser.banReason && `Sebep: ${currentUser.banReason}`}
          </div>
        ) : timeoutMins ? (
          <div className="bg-[#f5a623]/20 border border-[#f5a623]/40 rounded-lg px-4 py-3 text-[#f5a623] text-sm text-center">
            🔇 Susturuldunuz. {timeoutMins} dakika kaldı.
          </div>
        ) : !canSend ? (
          <div className="bg-[#4e5058] rounded-lg px-4 py-3 text-[#949ba4] text-sm text-center">
            🔒 Bu kanalda mesaj gönderme izniniz yok. Yalnızca Admin yazabilir.
          </div>
        ) : (
          <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`#${channel.name} kanalına mesaj gönder`}
              className="flex-1 bg-transparent text-[#dbdee1] resize-none outline-none text-sm leading-relaxed max-h-40 min-h-[24px] placeholder-[#6d6f78]"
              rows={1}
              style={{ height: 'auto' }}
              onInput={e => {
                const ta = e.target as HTMLTextAreaElement;
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1.5 text-[#949ba4] hover:text-[#dbdee1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        )}
        {error && <p className="text-[#f23f43] text-xs mt-1 px-1">{error}</p>}
      </div>
    </div>
  );
}