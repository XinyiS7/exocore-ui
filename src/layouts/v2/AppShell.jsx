import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileBottomBar from './MobileBottomBar';
import ContentRouter from './ContentRouter';

export default function AppShell({ appState }) {
  const [view, setView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});

  const navigate = useCallback((nextView, params = {}) => {
    setViewParams(params);
    setView(nextView);
  }, []);

  return (
    <div className="flex-1 flex min-w-0 h-full">
      {/* Desktop Sidebar — hidden on mobile */}
      <Sidebar view={view} setView={navigate} appState={appState} />

      {/* Content + Mobile Chrome */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header — hidden on desktop */}
        <MobileHeader view={view} viewParams={viewParams} onBack={() => navigate('dashboard')} />

        {/* ContentRouter — rendered once, shared by both platforms */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ContentRouter view={view} setView={navigate} viewParams={viewParams} appState={appState} />
        </div>

        {/* Mobile Bottom Bar — hidden on desktop */}
        <MobileBottomBar view={view} setView={navigate} appState={appState} />
      </div>
    </div>
  );
}
