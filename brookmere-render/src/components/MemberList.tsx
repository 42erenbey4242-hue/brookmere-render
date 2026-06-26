import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface Props {
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  onBan: (userId: string) => void;
  onTimeout: (userId: string, minutes: number) => void;
  onUnban: (userId: string) => void;
  onRemoveTimeout: (userId: string) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  user: User;
}

export default function MemberList({ users, currentUserId, isAdmin, onBan, onTimeout, onUnban, onRemoveTimeout }: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [showTimeoutInput, setShowTimeoutInput] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState('5');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (contextMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      if (rect.bottom > viewportH) {
        menuRef.current.style.top = (contextMenu.y - rect.height) + 'px';
      }
    }
  }, [contextMenu]);

  const handleRightClick = (e: React.MouseEvent, user: User) => {
    if (!isAdmin || user.id === currentUserId) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, user });
    setShowTimeoutInput(false);
    setTimeoutMinutes('5');
  };

  const adminUser = users.find(u => u.role === 'admin');
  const citizens = users.filter(u => u.role !== 'admin');
  const onlineAdmins = adminUser && adminUser.online ? [adminUser] : [];
  const offlineAdmins = adminUser && !adminUser.online ? [adminUser] : [];
  const onlineCitizens = citizens.filter(u => u.online && !u.isBanned);
  const offlineCitizens = citizens.filter(u => !u.online && !u.isBanned);
  const bannedUsers = citizens.filter(u => u.isBanned);

  const renderUser = (user: User) => {
    const isTimedOut = user.timeoutUntil && Date.now() < user.timeoutUntil;
    return (
      <div
        key={user.id}
        onContextMenu={e => handleRightClick(e, user)}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#393c41] transition-colors ${user.id === currentUserId ? 'bg-[#35373c]' : ''}`}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${user.role === 'admin' ? 'bg-[#f5a623]' : 'bg-[#5865f2]'} ${user.isBanned || !user.online ? 'opacity-40' : ''}`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          {/* Status dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${
            user.online && !user.isBanned ? 'bg-[#23a55a]' : 'bg-[#80848e]'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${
            user.isBanned ? 'text-[#f23f43] line-through' :
            user.online ? (user.role === 'admin' ? 'text-[#f5a623]' : 'text-[#dbdee1]') :
            'text-[#80848e]'
          }`}>
            {user.username}
            {user.role === 'admin' && ' 👑'}
            {isTimedOut && ' 🔇'}
            {user.isBanned && ' 🔨'}
          </div>
          {user.id === currentUserId && (
            <div className="text-[#949ba4] text-xs">Sen</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 overflow-y-auto py-4 px-2">
      {/* Admin */}
      {(onlineAdmins.length > 0 || offlineAdmins.length > 0) && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
            👑 Admin — {onlineAdmins.length > 0 ? 1 : 0}
          </h3>
          {onlineAdmins.map(renderUser)}
          {offlineAdmins.map(renderUser)}
        </div>
      )}

      {/* Online citizens */}
      {onlineCitizens.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
            👥 Vatandaşlar — {onlineCitizens.length}
          </h3>
          {onlineCitizens.map(renderUser)}
        </div>
      )}

      {/* Offline citizens */}
      {offlineCitizens.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
            Çevrimdışı — {offlineCitizens.length}
          </h3>
          {offlineCitizens.map(renderUser)}
        </div>
      )}

      {/* Banned */}
      {isAdmin && bannedUsers.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-[#f23f43] uppercase tracking-wider mb-1 px-2">
            🔨 Banlılar — {bannedUsers.length}
          </h3>
          {bannedUsers.map(renderUser)}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-[#111214] border border-[#2e3035] rounded-lg shadow-2xl py-1.5 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-[#2e3035] mb-1">
            <p className="text-white text-sm font-semibold">{contextMenu.user.username}</p>
            <p className="text-[#949ba4] text-xs">
              {contextMenu.user.online ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
            </p>
          </div>

          {contextMenu.user.isBanned ? (
            <button
              onClick={() => { onUnban(contextMenu.user.id); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[#23a55a] hover:bg-[#23a55a]/10 text-sm transition-colors"
            >
              ✅ Banı Kaldır
            </button>
          ) : (
            <button
              onClick={() => { onBan(contextMenu.user.id); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-[#f23f43] hover:bg-[#f23f43]/10 text-sm transition-colors"
            >
              🔨 Banla
            </button>
          )}

          {!contextMenu.user.isBanned && (
            <>
              {contextMenu.user.timeoutUntil && Date.now() < contextMenu.user.timeoutUntil ? (
                <button
                  onClick={() => { onRemoveTimeout(contextMenu.user.id); setContextMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[#23a55a] hover:bg-[#23a55a]/10 text-sm transition-colors"
                >
                  🔊 Susturmayı Kaldır
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowTimeoutInput(v => !v)}
                    className="w-full text-left px-3 py-1.5 text-[#f5a623] hover:bg-[#f5a623]/10 text-sm transition-colors"
                  >
                    🔇 Sustur (Timeout)
                  </button>
                  {showTimeoutInput && (
                    <div className="px-3 py-2 space-y-2">
                      <div className="flex gap-1.5">
                        {[5, 10, 30, 60].map(m => (
                          <button
                            key={m}
                            onClick={() => {
                              onTimeout(contextMenu.user.id, m);
                              setContextMenu(null);
                            }}
                            className="flex-1 bg-[#f5a623] text-black text-xs font-bold py-1 rounded hover:bg-[#e09519] transition-colors"
                          >
                            {m}d
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={timeoutMinutes}
                          onChange={e => setTimeoutMinutes(e.target.value)}
                          className="flex-1 bg-[#2b2d31] text-white px-2 py-1 rounded text-xs border border-[#4e5058] outline-none focus:border-[#5865f2]"
                          placeholder="Dakika"
                          min="1"
                          max="10080"
                        />
                        <button
                          onClick={() => {
                            const mins = parseInt(timeoutMinutes);
                            if (mins > 0) { onTimeout(contextMenu.user.id, mins); setContextMenu(null); }
                          }}
                          className="bg-[#f5a623] text-black text-xs font-bold px-2 py-1 rounded hover:bg-[#e09519] transition-colors"
                        >
                          Uygula
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
