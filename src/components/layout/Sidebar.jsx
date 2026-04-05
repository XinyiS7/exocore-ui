import React, { useState, useRef } from 'react';
import { MessageSquare, BrainCircuit, User, Settings, Hexagon, Camera } from 'lucide-react';
import { getUserAvatarUrl } from '../../utils/avatar';
import AvatarCropModal from '../modals/AvatarCropModal';

const NavIcon = ({ icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`p-2 transition-all ${
      isActive
        ? 'text-exo-gold bg-exo-gold/5 border-b-2 border-exo-gold rounded-t-lg md:border-b-0 md:border-l-2 md:rounded-t-none md:rounded-r-lg'
        : 'text-exo-muted rounded-lg hover:text-exo-text hover:bg-white/5'
    }`}
  >
    <Icon size={22} />
  </button>
);

const Sidebar = ({ currentTab, setCurrentTab, showConvList, setShowConvList }) => {
  const [userAvatarUrl, setUserAvatarUrl] = useState(() => getUserAvatarUrl());
  const [cropFile, setCropFile] = useState(null);
  const avatarInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = '';
  };

  return (
    <>
    {cropFile && (
      <AvatarCropModal
        file={cropFile}
        onConfirm={(dataUrl) => {
          localStorage.setItem('exo_user_avatar_url', dataUrl);
          setUserAvatarUrl(dataUrl);
          setCropFile(null);
        }}
        onCancel={() => setCropFile(null)}
      />
    )}
    <div className="w-full md:w-16 h-14 md:h-full bg-exo-panel border-t border-exo-gold/15 md:border-t-0 md:border-r md:border-exo-metal flex flex-row md:flex-col items-center justify-between px-6 md:px-0 py-0 md:py-4 flex-shrink-0 z-50">

      {/* 桌面顶部金色分隔线 */}
      <div className="hidden md:block w-full h-px bg-gradient-to-r from-transparent via-exo-gold/30 to-transparent flex-shrink-0 mb-4" />

      <div className="flex flex-row md:flex-col space-x-6 md:space-x-0 md:space-y-6 items-center w-full md:w-auto justify-between md:justify-start">
        <div className="hidden md:block p-1.5 md:p-2 bg-exo-bg rounded-lg border border-exo-gold/20 cursor-pointer text-exo-gold/70">
          <Hexagon size={20} />
        </div>

        <div className="flex md:flex-col gap-8 md:gap-6 justify-around md:justify-start w-full md:w-auto">
          <NavIcon icon={MessageSquare} isActive={currentTab === 'chat'} onClick={() => { setCurrentTab('chat'); setShowConvList(true); }} />
          <NavIcon icon={BrainCircuit} isActive={currentTab === 'agent_hub'} onClick={() => { setCurrentTab('agent_hub'); setShowConvList(false); }} />
          <NavIcon icon={User} isActive={currentTab === 'profile'} onClick={() => { setCurrentTab('profile'); setShowConvList(false); }} />
          <span className="md:hidden"><NavIcon icon={Settings} isActive={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} /></span>
        </div>
      </div>

      <div className="hidden md:flex flex-col space-y-6 items-center">
        <NavIcon icon={Settings} isActive={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} />

        {/* 用户头像 + 上传 */}
        <div
          className="relative cursor-pointer group"
          onClick={() => avatarInputRef.current?.click()}
          title="点击更换头像"
        >
          <img src={userAvatarUrl} className="w-9 h-9 rounded-full border border-exo-border/60 object-cover bg-black" alt="User" />
          <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={12} className="text-white" />
          </div>
          <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
