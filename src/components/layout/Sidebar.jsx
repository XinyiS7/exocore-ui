import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, BrainCircuit, User, Settings, Hexagon, Camera, Users } from 'lucide-react';
import { getUserAvatarUrl } from '../../utils/avatar';
import AvatarCropModal from '../modals/AvatarCropModal';

const NavIcon = ({ icon: Icon, isActive, onClick, title, label, isExpanded }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-2.5 transition-all group/nav relative ${
      isActive
        ? 'text-exo-gold'
        : 'text-exo-muted hover:text-exo-text'
    }`}
  >
    <div className={`p-2 rounded-xl transition-all ${
      isActive 
        ? 'bg-exo-gold/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
        : 'group-hover/nav:bg-white/5'
    }`}>
      <Icon size={20} className={isActive ? 'drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]' : ''} />
    </div>
    
    <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${
      isExpanded ? 'opacity-100 w-32' : 'opacity-0 w-0'
    }`}>
      {label}
    </span>

    {/* Tooltip for collapsed state */}
    {!isExpanded && (
      <div className="absolute left-14 px-2 py-1 bg-exo-panel border border-exo-border rounded text-[10px] text-exo-gold opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] tracking-widest uppercase">
        {title}
      </div>
    )}

    {isActive && (
      <div className="absolute right-0 w-0.5 h-6 bg-exo-gold rounded-l-full shadow-[0_0_10px_rgba(212,175,55,0.8)] md:block hidden" />
    )}
  </button>
);

const Sidebar = ({ currentTab, setCurrentTab, showConvList, setShowConvList }) => {
  const [userAvatarUrl, setUserAvatarUrl] = useState(() => getUserAvatarUrl());
  const [cropFile, setCropFile] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const avatarInputRef = useRef(null);
  const [userNick, setUserNick] = useState(() => localStorage.getItem('exo_user_nick') || 'Exo User');

  useEffect(() => {
    const handleStorage = () => {
      setUserNick(localStorage.getItem('exo_user_nick') || 'Exo User');
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('user-nick-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-nick-updated', handleStorage);
    };
  }, []);

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
    
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        h-14 md:h-full flex flex-row md:flex-col items-center justify-between z-50 transition-all duration-500 ease-out
        w-full md:w-16 md:hover:w-56
        bg-exo-bg/40 backdrop-blur-xl
        border-t border-exo-gold/10 md:border-t-0 md:border-r md:border-white/5
        px-3 md:px-2 py-0 md:py-6 flex-shrink-0
        relative group
      `}
    >
      {/* Decorative Top Accent */}
      <div className="hidden md:block absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-exo-gold/20 to-transparent" />

      <div className="flex flex-row md:flex-col items-center w-full md:w-auto justify-between md:justify-start md:space-y-4">
        {/* Logo Section */}
        <button
          onClick={() => { setCurrentTab('home'); setShowConvList(false); }}
          className={`hidden md:flex items-center gap-3 w-full p-2.5 mb-4 group/logo transition-all`}
        >
          <div className={`p-2 rounded-xl border transition-all ${
            currentTab === 'home' 
              ? 'border-exo-gold/40 bg-exo-gold/5 text-exo-gold' 
              : 'border-white/5 text-exo-gold/40 group-hover/logo:border-exo-gold/30 group-hover/logo:text-exo-gold/70'
          }`}>
            <Hexagon size={20} className={currentTab === 'home' ? 'animate-pulse-led' : ''} />
          </div>
          <span className={`text-xs font-bold tracking-[0.2em] text-exo-gold uppercase transition-all duration-300 overflow-hidden ${
            isHovered ? 'opacity-100 w-32' : 'opacity-0 w-0'
          }`}>
            ExoCore
          </span>
        </button>

        <div className="flex md:flex-col items-center justify-around md:justify-start w-full md:w-auto gap-2 md:gap-1">
          <NavIcon icon={MessageSquare} title="会话" label="会话列表" isActive={currentTab === 'chat'} isExpanded={isHovered} onClick={() => { setCurrentTab('chat'); setShowConvList(true); }} />
          <NavIcon icon={Users} title="议会" label="议事议会" isActive={currentTab === 'council'} isExpanded={isHovered} onClick={() => { setCurrentTab('council'); setShowConvList(true); }} />
          <NavIcon icon={BrainCircuit} title="Agent 枢纽" label="Agent 枢纽" isActive={currentTab === 'agent_hub'} isExpanded={isHovered} onClick={() => { setCurrentTab('agent_hub'); setShowConvList(false); }} />
          <NavIcon icon={User} title="时间线" label="个人时间线" isActive={currentTab === 'profile'} isExpanded={isHovered} onClick={() => { setCurrentTab('profile'); setShowConvList(false); }} />
          <span className="md:hidden">
            <NavIcon icon={Settings} title="设置" label="全局设置" isActive={currentTab === 'settings'} isExpanded={false} onClick={() => setCurrentTab('settings')} />
          </span>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center gap-4 w-full">
        <NavIcon icon={Settings} title="设置" label="系统设置" isActive={currentTab === 'settings'} isExpanded={isHovered} onClick={() => setCurrentTab('settings')} />

        {/* User Profile Section */}
        <div className="w-full h-px bg-white/5 my-2" />
        
        <div
          className="relative cursor-pointer group/avatar flex items-center gap-3 w-full p-1 rounded-xl transition-all hover:bg-white/5"
          onClick={() => avatarInputRef.current?.click()}
        >
          <div className="relative shrink-0">
            <img 
              src={userAvatarUrl} 
              className="w-10 h-10 rounded-xl border border-white/10 object-cover bg-black group-hover/avatar:border-exo-gold/30 transition-all" 
              alt="User" 
            />
            <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={14} className="text-white" />
            </div>
          </div>
          
          <div className={`transition-all duration-300 overflow-hidden ${
            isHovered ? 'opacity-100 w-32' : 'opacity-0 w-0'
          }`}>
            <p className="text-xs font-bold text-exo-gold/80 truncate">{userNick}</p>
            <p className="text-[10px] text-exo-muted truncate tracking-tighter opacity-70">EXO-CORE AUTHENTICATED</p>
          </div>
          
          <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
