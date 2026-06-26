import React, { useState } from 'react';
import { User } from '../types';

interface Props {
  user: User;
  onChangeName: (newName: string) => { success: boolean; error?: string };
  onLogout: () => void;
  onClose: () => void;
}

export default function SettingsPanel({ user, onChangeName, onLogout, onClose }: Props) {
  const [newName, setNewName] = useState(user.username);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');

  const canChangeName = () => {
    if (user.role === 'admin') return true;
    if (!user.lastNameChangeAt) return true;
    const diff = Date.now() - user.lastNameChangeAt;
    return diff >= 30 * 24 * 60 * 60 * 1000;
  };

  const daysUntilNameChange = () => {
    if (!user.lastNameChangeAt) return 0;
    const diff = Date.now() - user.lastNameChangeAt;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return Math.ceil((thirtyDays - diff) / (24 * 60 * 60 * 1000));
  };

  const handleNameChange = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');
    const result = onChangeName(newName);
    if (result.success) {
      setNameSuccess('İsim başarıyla değiştirildi!');
    } else {
      setNameError(result.error || 'Hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#2b2d31] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-[#232428] p-4 flex flex-col shrink-0">
          <h2 className="text-xs font-bold text-[#949ba4] uppercase tracking-wider mb-2 px-2">Ayarlar</h2>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`text-left px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#393c41] text-white' : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'}`}
          >
            Profilim
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`text-left px-2 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-[#393c41] text-white' : 'text-[#949ba4] hover:text-white hover:bg-[#35373c]'}`}
          >
            Hesap
          </button>

          <div className="mt-auto">
            <div className="border-t border-[#1e1f22] pt-3 mt-3">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full text-left px-2 py-1.5 rounded text-sm text-[#f23f43] hover:bg-[#f23f43]/10 font-medium transition-colors"
              >
                Hesaptan Çıkış Yap
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-bold">
              {activeTab === 'profile' ? 'Profil Ayarları' : 'Hesap Ayarları'}
            </h2>
            <button onClick={onClose} className="text-[#949ba4] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {activeTab === 'profile' && (
            <div>
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-[#1e1f22] rounded-lg">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${user.role === 'admin' ? 'bg-[#f5a623]' : 'bg-[#5865f2]'}`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">{user.username}</span>
                    {user.role === 'admin' && <span className="text-xs bg-[#f5a623] text-black px-2 py-0.5 rounded-full font-bold">👑 Admin</span>}
                    {user.role === 'citizen' && <span className="text-xs bg-[#5865f2] text-white px-2 py-0.5 rounded-full font-bold">👥 Vatandaş</span>}
                  </div>
                  <p className="text-[#949ba4] text-sm">Brookmere Vatandaşı</p>
                </div>
              </div>

              {/* Name change */}
              <div className="bg-[#1e1f22] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-1">İsim Değiştir</h3>
                
                {!canChangeName() && (
                  <div className="mb-3 p-3 bg-[#f5a623]/20 border border-[#f5a623]/40 rounded text-[#f5a623] text-sm">
                    ⏳ İsim değiştirme hakkınızı kullanmak için <strong>{daysUntilNameChange()} gün</strong> daha beklemeniz gerekiyor.
                  </div>
                )}

                <form onSubmit={handleNameChange} className="flex gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    disabled={!canChangeName()}
                    className="flex-1 bg-[#2b2d31] text-white px-3 py-2 rounded-md border border-[#1e1f22] focus:outline-none focus:border-[#5865f2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    maxLength={32}
                  />
                  <button
                    type="submit"
                    disabled={!canChangeName() || newName.trim() === user.username}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Kaydet
                  </button>
                </form>

                {nameError && <p className="mt-2 text-[#f23f43] text-sm">{nameError}</p>}
                {nameSuccess && <p className="mt-2 text-[#23a55a] text-sm">{nameSuccess}</p>}

                {user.role !== 'admin' && (
                  <p className="mt-2 text-[#949ba4] text-xs">
                    İsim değiştirme hakkı 30 günde bir kullanılabilir.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-[#1e1f22] rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Hesap Bilgileri</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#949ba4]">Kullanıcı Adı</span>
                    <span className="text-white">{user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#949ba4]">Rol</span>
                    <span className="text-white">{user.role === 'admin' ? '👑 Admin' : '👥 Vatandaş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#949ba4]">Kayıt Tarihi</span>
                    <span className="text-white">{new Date(user.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#f23f43]/10 border border-[#f23f43]/30 rounded-lg p-4">
                <h3 className="text-[#f23f43] font-semibold mb-2">Tehlikeli Bölge</h3>
                <p className="text-[#949ba4] text-sm mb-3">
                  Hesabınızdan çıkış yaparsanız bu hesaba tekrar giriş yapamazsınız.
                </p>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="bg-[#f23f43] hover:bg-[#c93b3b] text-white px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                >
                  Hesaptan Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <div className="bg-[#2b2d31] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white text-xl font-bold mb-3">Emin misiniz?</h3>
            <p className="text-[#949ba4] mb-6">
              Bu hesaba tekrar giriş yapamayacaksınız. Yeni bir hesap oluşturabilirsiniz, ancak <strong className="text-white">30 gün boyunca</strong> tekrar hesap değiştiremezsiniz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2.5 rounded-md font-semibold transition-colors"
              >
                Geri Dön
              </button>
              <button
                onClick={onLogout}
                className="flex-1 bg-[#f23f43] hover:bg-[#c93b3b] text-white py-2.5 rounded-md font-semibold transition-colors"
              >
                Eminim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
