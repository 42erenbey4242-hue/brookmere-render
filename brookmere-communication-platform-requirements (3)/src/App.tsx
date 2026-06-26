import { useState, useEffect } from 'react';
import { useAppState } from './useAppState';
import { Channel, Category, Server } from './types';
import RegisterScreen from './components/RegisterScreen';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import MemberList from './components/MemberList';
import SettingsPanel from './components/SettingsPanel';
import FirebaseSetup, { getStoredFirebaseConfig, storeFirebaseConfig } from './components/FirebaseSetup';
import {
  CreateServerModal,
  ServerSettingsModal,
  ChannelModal,
  CategoryModal,
} from './components/Modals';
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
  const [modal, setModal] = useState<ModalType>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);
  const [firebaseOnline, setFirebaseOnline] = useState(false);

  // Initialize Firebase if config exists
  useEffect(() => {
    const config = getStoredFirebaseConfig();
    if (config && config.apiKey && config.databaseURL && !config.apiKey.includes('Demo')) {
      const ok = setupFirebase(config);
      if (ok) {
        setFirebaseConfigured(true);
        setFirebaseOnline(true);
      }
    }
  }, []);

  // Auto-login on mount
  useEffect(() => {
    const loggedIn = app.autoLogin();
    if (loggedIn) {
      const uid = getStoredSession();
      setCurrentUserId(uid);
      setIsLoggedIn(true);
    }
    setIsLoading(false);
  }, []); // eslint-disable-line

  // Auto-select first server
  useEffect(() => {
    if (!isLoggedIn) return;
    const servers = Object.values(app.state.servers).sort((a, b) => a.createdAt - b.createdAt);
    if (servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id);
    }
    if (selectedServerId && !app.state.servers[selectedServerId]) {
      const remaining = servers.filter(s => s.id !== selectedServerId);
      setSelectedServerId(remaining.length > 0 ? remaining[0].id : null);
      setSelectedChannelId(null);
    }
  }, [app.state.servers, isLoggedIn]); // eslint-disable-line

  // Auto-select first channel when server changes
  useEffect(() => {
    if (!selectedServerId) return;
    const serverChannels = Object.values(app.state.channels)
      .filter(c => c.serverId === selectedServerId)
      .sort((a, b) => a.order - b.order);
    if (serverChannels.length > 0 && (!selectedChannelId || !serverChannels.find(c => c.id === selectedChannelId))) {
      setSelectedChannelId(serverChannels[0].id);
    }
  }, [selectedServerId, app.state.channels]); // eslint-disable-line

  const currentUser = currentUserId ? app.state.users[currentUserId] : null;
  const isAdmin = currentUser?.role === 'admin';

  const servers = Object.values(app.state.servers).sort((a, b) => a.createdAt - b.createdAt);
  const selectedServer = selectedServerId ? app.state.servers[selectedServerId] : null;

  const serverChannels = selectedServerId
    ? Object.values(app.state.channels).filter(c => c.serverId === selectedServerId)
    : [];

  const serverCategories = selectedServerId
    ? Object.values(app.state.categories).filter(c => c.serverId === selectedServerId)
    : [];

  const selectedChannel = selectedChannelId ? app.state.channels[selectedChannelId] : null;

  const channelMessages = selectedChannelId
    ? Object.values(app.state.messages)
        .filter(m => m.channelId === selectedChannelId)
        .sort((a, b) => a.createdAt - b.createdAt)
    : [];

  const allUsers = Object.values(app.state.users);

  const getDeviceCooldownDays = (): number => {
    const deviceId = getDeviceId();
    const s = loadState();
    const cooldownTs = s.deviceAccountCooldown[deviceId];
    if (!cooldownTs) return 0;
    const diff = Date.now() - cooldownTs;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (diff >= thirtyDays) return 0;
    return Math.ceil((thirtyDays - diff) / (24 * 60 * 60 * 1000));
  };

  const handleFirebaseSetup = (config: Parameters<typeof setupFirebase>[0]) => {
    const ok = setupFirebase(config);
    storeFirebaseConfig(config);
    if (ok) {
      setFirebaseConfigured(true);
      setFirebaseOnline(true);
    }
    setShowFirebaseSetup(false);
  };

  const handleRegister = (username: string, password: string) => {
    const result = app.register(username, password);
    if (result.success) {
      const uid = getStoredSession();
      setCurrentUserId(uid);
      setIsLoggedIn(true);
    }
    return result;
  };

  const handleAdminLogin = (username: string, password: string) => {
    const result = app.loginAdmin(username, password);
    if (result.success) {
      const uid = getStoredSession();
      setCurrentUserId(uid);
      setIsLoggedIn(true);
    }
    return result;
  };

  const handleLogout = () => {
    app.logout(true);
    setIsLoggedIn(false);
    setCurrentUserId(null);
    setSelectedServerId(null);
    setSelectedChannelId(null);
    setShowSettings(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#313338] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#5865f2] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <p className="text-[#949ba4] text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return (
      <>
        <RegisterScreen
          onRegister={handleRegister}
          onAdminLogin={handleAdminLogin}
          deviceCooldownDays={getDeviceCooldownDays()}
        />
        {showFirebaseSetup && (
          <FirebaseSetup
            onSetup={handleFirebaseSetup}
            onSkip={() => setShowFirebaseSetup(false)}
            isConfigured={firebaseConfigured}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#313338] overflow-hidden">
      {/* Server Sidebar */}
      <ServerSidebar
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={id => {
          setSelectedServerId(id);
          setSelectedChannelId(null);
        }}
        isAdmin={isAdmin}
        onCreateServer={() => setModal({ type: 'create_server' })}
      />

      {/* Channel Sidebar */}
      {selectedServer ? (
        <ChannelSidebar
          server={selectedServer}
          categories={serverCategories}
          channels={serverChannels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onCreateChannel={catId => setModal({ type: 'create_channel', categoryId: catId })}
          onCreateCategory={() => setModal({ type: 'create_category' })}
          onEditChannel={ch => setModal({ type: 'edit_channel', channel: ch })}
          onDeleteChannel={id => {
            if (window.confirm('Bu kanalı silmek istediğinizden emin misiniz?')) {
              app.deleteChannel(id);
              if (selectedChannelId === id) setSelectedChannelId(null);
            }
          }}
          onEditCategory={cat => setModal({ type: 'edit_category', category: cat })}
          onDeleteCategory={id => {
            if (window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz? Kanallar kategorisiz kalır.')) {
              app.deleteCategory(id);
            }
          }}
          onReorderChannels={app.updateChannels}
          onOpenSettings={() => setModal({ type: 'server_settings', server: selectedServer })}
          onOpenUserSettings={() => setShowSettings(true)}
        />
      ) : (
        <div className="w-60 bg-[#2b2d31] flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-4xl mb-3">🌐</div>
              <p className="text-[#949ba4] text-sm">
                {servers.length === 0
                  ? isAdmin
                    ? 'Sunucu oluşturmak için sol taraftaki + butonuna tıklayın.'
                    : 'Admin bir sunucu oluşturduğunda otomatik olarak katılacaksınız.'
                  : 'Sol taraftan bir sunucu seçin.'}
              </p>
            </div>
          </div>
          <UserPanelBottom currentUser={currentUser} onSettings={() => setShowSettings(true)} />
        </div>
      )}

      {/* Chat Area */}
      <ChatArea
        channel={selectedChannel || null}
        messages={channelMessages}
        currentUser={currentUser}
        users={app.state.users}
        onSendMessage={(content) => {
          if (!selectedChannelId) return { success: false, error: 'Kanal seçilmedi.' };
          return app.sendMessage(selectedChannelId, currentUser.id, currentUser.username, content);
        }}
      />

      {/* Member List */}
      <MemberList
        users={allUsers}
        currentUserId={currentUser.id}
        isAdmin={isAdmin}
        onBan={userId => {
          if (window.confirm('Bu kullanıcıyı banlamak istediğinizden emin misiniz?')) {
            app.banUser(userId);
          }
        }}
        onTimeout={(userId, minutes) => app.timeoutUser(userId, minutes)}
        onUnban={userId => app.unbanUser(userId)}
        onRemoveTimeout={userId => app.removeTimeout(userId)}
      />

      {/* Firebase status indicator */}
      {isAdmin && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShowFirebaseSetup(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold shadow-lg transition-colors ${
              firebaseOnline && isFirebaseEnabled()
                ? 'bg-[#23a55a] text-white hover:bg-[#1a8a47]'
                : 'bg-[#f5a623] text-black hover:bg-[#e09519]'
            }`}
            title={firebaseOnline ? 'Firebase bağlı - Gerçek zamanlı çoklu kullanıcı aktif' : 'Firebase bağlı değil - Sadece tek cihaz modu'}
          >
            {firebaseOnline && isFirebaseEnabled() ? (
              <>🔥 Firebase Aktif</>
            ) : (
              <>⚠️ Firebase Kur</>
            )}
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          user={currentUser}
          onChangeName={newName => app.changeName(currentUser.id, newName)}
          onLogout={handleLogout}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Firebase Setup Modal */}
      {showFirebaseSetup && (
        <FirebaseSetup
          onSetup={handleFirebaseSetup}
          onSkip={() => setShowFirebaseSetup(false)}
          isConfigured={firebaseConfigured}
        />
      )}

      {/* Modals */}
      {modal?.type === 'create_server' && (
        <CreateServerModal
          onClose={() => setModal(null)}
          onCreate={name => {
            const server = app.createServer(name);
            setSelectedServerId(server.id);
          }}
        />
      )}

      {modal?.type === 'server_settings' && (
        <ServerSettingsModal
          server={modal.server}
          onClose={() => setModal(null)}
          onUpdate={updates => {
            if (updates.icon === 'REMOVE') {
              app.updateServer(modal.server.id, { ...updates, icon: null });
            } else {
              app.updateServer(modal.server.id, updates);
            }
          }}
          onDelete={() => {
            app.deleteServer(modal.server.id);
            setSelectedServerId(null);
            setSelectedChannelId(null);
          }}
        />
      )}

      {modal?.type === 'create_channel' && selectedServerId && (
        <ChannelModal
          categories={serverCategories}
          defaultCategoryId={modal.categoryId}
          onClose={() => setModal(null)}
          onSave={(name, catId, permission) => {
            const ch = app.createChannel(selectedServerId, catId, name);
            app.updateChannel(ch.id, { permission });
            setSelectedChannelId(ch.id);
          }}
        />
      )}

      {modal?.type === 'edit_channel' && (
        <ChannelModal
          channel={modal.channel}
          categories={serverCategories}
          onClose={() => setModal(null)}
          onSave={(name, catId, permission) => {
            app.updateChannel(modal.channel.id, { name, categoryId: catId, permission });
          }}
        />
      )}

      {modal?.type === 'create_category' && selectedServerId && (
        <CategoryModal
          onClose={() => setModal(null)}
          onSave={name => app.createCategory(selectedServerId, name)}
        />
      )}

      {modal?.type === 'edit_category' && (
        <CategoryModal
          category={modal.category}
          onClose={() => setModal(null)}
          onSave={name => app.updateCategory(modal.category.id, { name })}
        />
      )}
    </div>
  );
}

// ── Shared sub-component ──────────────────────────────────────────────────────

function UserPanelBottom({ currentUser, onSettings }: { currentUser: { username: string; role: string }; onSettings: () => void }) {
  return (
    <div className="bg-[#232428] px-2 py-2 flex items-center gap-2 border-t border-[#1e1f22]">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${currentUser.role === 'admin' ? 'bg-[#f5a623]' : 'bg-[#5865f2]'}`}>
        {currentUser.username.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{currentUser.username}</div>
        <div className="text-[#949ba4] text-xs flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#23a55a] inline-block" />
          Çevrimiçi
        </div>
      </div>
      <button
        onClick={onSettings}
        className="p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}
