import { useState, useEffect } from 'react';
import { useAppState } from './useAppState';
import { Channel, Category, Server } from './types';
import RegisterScreen from './components/RegisterScreen';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import MemberList from './components/MemberList';
import SettingsPanel from './components/SettingsPanel';
import DMArea from './components/DMArea';
import FirebaseSetup, { getStoredFirebaseConfig, storeFirebaseConfig } from './components/FirebaseSetup';
import { CreateServerModal, ServerSettingsModal, ChannelModal, CategoryModal } from './components/Modals';
import { loadState, getDeviceId, getStoredSession, setupFirebase, isFirebaseEnabled } from './store';

type ModalType =
  | { type: 'create_server' }
  | { type: 'server_settings'; server: Server }
  | { type: 'create_channel'; categoryId: string | null }
  | { type: 'edit_channel'; channel: Channel }
  | { type: 'create_category' }
  | { type: 'edit_category'; category: Category }
  | null;

export default function App() {
  const app = useAppState();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);
  const [firebaseOnline, setFirebaseOnline] = useState(false);

  useEffect(() => {
    if (isFirebaseEnabled()) { setFirebaseConfigured(true); setFirebaseOnline(true); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const uid = getStoredSession();
      if (uid) {
        const s = loadState();
        if (s.users[uid] && !s.users[uid].isBanned) {
          const ok = app.autoLogin();
          if (ok) { setCurrentUserId(uid); setIsLoggedIn(true); app.markOnline(uid); }
        }
      }
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRegister = (username: string, password: string) => {
    const result = app.register(username, password);
    if (result.success) {
      const uid = getStoredSession();
      if (uid) { setCurrentUserId(uid); setIsLoggedIn(true); app.markOnline(uid); }
    }
    return result;
  };

  const handleLoginAdmin = (username: string, password: string) => {
    const result = app.loginAdmin(username, password);
    if (result.success) {
      const uid = getStoredSession();
      if (uid) { setCurrentUserId(uid); setIsLoggedIn(true); app.markOnline(uid); }
    }
    return result;
  };

  const handleLogout = () => {
    app.logout(true);
    setIsLoggedIn(false); setCurrentUserId(null);
    setSelectedServerId(null); setSelectedChannelId(null); setActiveDMUserId(null);
    setShowSettings(false);
  };

  const handleFirebaseSetup = (config: Parameters<typeof setupFirebase>[0]) => {
    const ok = setupFirebase(config);
    if (ok) { storeFirebaseConfig(config); setFirebaseConfigured(true); setFirebaseOnline(true); setShowFirebaseSetup(false); }
  };

  const handleOpenDM = (userId: string) => {
    app.getOrCreateConversation(currentUserId!, userId);
    setActiveDMUserId(userId);
    setSelectedServerId(null);
    setSelectedChannelId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#313338]">
        <div className="text-white text-lg animate-pulse">Yükleniyor...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <RegisterScreen
        onRegister={handleRegister}
        onAdminLogin={handleLoginAdmin}
      />
    );
  }

  const currentUser = app.state.users[currentUserId!];
  if (!currentUser) { handleLogout(); return null; }

  const isAdmin = currentUser.role === 'admin';
  const allUsers = Object.values(app.state.users);
  const servers = Object.values(app.state.servers).sort((a, b) => a.createdAt - b.createdAt);
  const selectedServer = selectedServerId ? app.state.servers[selectedServerId] : null;
  const serverCategories = selectedServer ? Object.values(app.state.categories).filter(c => c.serverId === selectedServerId) : [];
  const serverChannels = selectedServer ? Object.values(app.state.channels).filter(c => c.serverId === selectedServerId) : [];
  const dmConversations = Object.values(app.state.dmConversations);

  // DM messages for active conversation
  const activeDMMessages = activeDMUserId
    ? Object.values(app.state.directMessages)
        .filter(dm => {
          const convId = [currentUserId, activeDMUserId].sort().join('_');
          return dm.conversationId === convId;
        })
        .sort((a, b) => a.createdAt - b.createdAt)
    : [];

  const activeDMUser = activeDMUserId ? app.state.users[activeDMUserId] : null;

  return (
    <div className="flex h-screen bg-[#313338] overflow-hidden">
      {/* Server sidebar */}
      <ServerSidebar
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={(id) => { setSelectedServerId(id); setActiveDMUserId(null); setSelectedChannelId(null); }}
        isAdmin={isAdmin}
        onCreateServer={() => setModal({ type: 'create_server' })}
        currentUser={currentUser}
        dmConversations={dmConversations}
        users={allUsers}
        activeDMUserId={activeDMUserId}
        onSelectDM={handleOpenDM}
      />

      {/* Channel sidebar (only when server selected) */}
      {selectedServer && (
        <ChannelSidebar
          server={selectedServer}
          categories={serverCategories}
          channels={serverChannels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onCreateChannel={(catId) => setModal({ type: 'create_channel', categoryId: catId })}
          onCreateCategory={() => setModal({ type: 'create_category' })}
          onEditChannel={(ch) => setModal({ type: 'edit_channel', channel: ch })}
          onDeleteChannel={app.deleteChannel}
          onEditCategory={(cat) => setModal({ type: 'edit_category', category: cat })}
          onDeleteCategory={app.deleteCategory}
          onReorderChannels={app.updateChannels}
          onReorderCategories={app.reorderCategories}
          onOpenSettings={() => setModal({ type: 'server_settings', server: selectedServer })}
          onOpenUserSettings={() => setShowSettings(true)}
        />
      )}

      {/* DM sidebar placeholder when DM active without server */}
      {activeDMUserId && !selectedServerId && (
        <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[#1e1f22]">
            <span className="text-white font-bold text-base">Direkt Mesajlar</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {dmConversations
              .filter(c => c.participants.includes(currentUserId!))
              .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
              .map(conv => {
                const otherId = conv.participants.find(p => p !== currentUserId);
                const other = otherId ? app.state.users[otherId] : null;
                if (!other) return null;
                return (
                  <div key={conv.id}
                    onClick={() => setActiveDMUserId(other.id)}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${activeDMUserId === other.id ? 'bg-[#393c41]' : 'hover:bg-[#35373c]'}`}
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                      {other.avatarUrl ? (
                        <img src={other.avatarUrl} alt={other.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white text-sm font-bold ${other.role === 'admin' ? 'bg-[#f5a623]' : 'bg-[#5865f2]'}`}>
                          {other.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${other.online ? 'bg-[#23a55a]' : 'bg-[#80848e]'}`} />
                    </div>
                    <span className="text-[#dbdee1] text-sm font-medium truncate">{other.username}</span>
                  </div>
                );
              })}
          </div>
          {/* User panel */}
          <div className="bg-[#232428] px-2 py-2 flex items-center gap-2 border-t border-[#1e1f22]">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-white text-sm font-bold ${currentUser.role === 'admin' ? 'bg-[#f5a623]' : 'bg-[#5865f2]'}`}>
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{currentUser.username}</div>
              <div className="text-[#949ba4] text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#23a55a] inline-block" />Çevrimiçi
              </div>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* DM Area */}
        {activeDMUserId && activeDMUser ? (
          <DMArea
            currentUser={currentUser}
            otherUser={activeDMUser}
            messages={activeDMMessages}
            onSend={(content) => app.sendDirectMessage(currentUserId!, activeDMUserId, content)}
            onClose={() => { setActiveDMUserId(null); }}
          />
        ) : selectedChannelId ? (
          <>
            <ChatArea
              channel={app.state.channels[selectedChannelId]}
              messages={Object.values(app.state.messages).filter(m => m.channelId === selectedChannelId).sort((a, b) => a.createdAt - b.createdAt)}
              currentUser={currentUser}
              users={app.state.users}
              onSend={(content) => app.sendMessage(selectedChannelId, currentUserId!, currentUser.username, content)}
              onOpenDM={handleOpenDM}
            />
            <MemberList
              users={allUsers}
              currentUserId={currentUserId!}
              isAdmin={isAdmin}
              onBan={app.banUser}
              onTimeout={app.timeoutUser}
              onRemoveTimeout={app.removeTimeout}
              onOpenDM={handleOpenDM}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#313338]">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {activeDMUserId ? '💬' : selectedServer ? '📢' : '🏙️'}
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">
                {selectedServer ? `${selectedServer.name}'e Hoş Geldiniz` : 'Brookmere\'ye Hoş Geldiniz'}
              </h2>
              <p className="text-[#949ba4]">
                {selectedServer ? 'Bir kanal seçerek konuşmaya başlayın.' : 'Sol taraftan bir sunucu seçin.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Firebase status (admin only) */}
      {isAdmin && (
        <button
          onClick={() => !firebaseOnline && setShowFirebaseSetup(true)}
          className={`fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg z-40 transition-colors ${
            firebaseOnline ? 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/30 cursor-default' : 'bg-[#f23f43]/20 text-[#f23f43] border border-[#f23f43]/30 hover:bg-[#f23f43]/30'
          }`}
          title={firebaseOnline ? 'Firebase bağlı' : 'Firebase bağlı değil - Tıkla'}
        >
          {firebaseOnline ? '🔥 Firebase Aktif' : '⚠️ Firebase Bağlı Değil'}
        </button>
      )}

      {/* Modals */}
      {modal?.type === 'create_server' && (
        <CreateServerModal
          onCreate={(name) => { app.createServer(name); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'server_settings' && (
        <ServerSettingsModal
          server={modal.server}
          onUpdate={(updates) => { app.updateServer(modal.server.id, updates); setModal(null); }}
          onDelete={() => { app.deleteServer(modal.server.id); setSelectedServerId(null); setSelectedChannelId(null); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'create_channel' && (
        <ChannelModal
          categories={serverCategories}
          defaultCategoryId={modal.categoryId}
          onSave={(name, catId, permission) => {
            const ch = app.createChannel(selectedServerId!, catId, name);
            app.updateChannel(ch.id, { permission });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit_channel' && (
        <ChannelModal
          channel={modal.channel}
          categories={serverCategories}
          defaultCategoryId={modal.channel.categoryId}
          onSave={(name, catId, permission) => { app.updateChannel(modal.channel.id, { name, categoryId: catId, permission }); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'create_category' && (
        <CategoryModal
          onSave={(name) => { app.createCategory(selectedServerId!, name); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit_category' && (
        <CategoryModal
          category={modal.category}
          onSave={(name) => { app.updateCategory(modal.category.id, { name }); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          user={currentUser}
          onChangeName={(name) => app.changeName(currentUserId!, name)}
          onUpdateProfile={(updates) => app.updateProfile(currentUserId!, updates)}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showFirebaseSetup && (
        <FirebaseSetup
          isConfigured={firebaseConfigured}
          onSetup={handleFirebaseSetup}
          onSkip={() => setShowFirebaseSetup(false)}
        />
      )}
    </div>
  );
}
