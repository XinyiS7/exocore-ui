import React, { useState } from 'react';
import DesktopShell from './DesktopShell';
import MobileShell from './MobileShell';

export default function AppShell({ appState }) {
  const [view, setView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});

  const navigate = (nextView, params = {}) => {
    setViewParams(params);
    setView(nextView);
  };

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <DesktopShell view={view} setView={navigate} viewParams={viewParams} appState={appState} />
      <MobileShell view={view} setView={navigate} viewParams={viewParams} appState={appState} />
    </div>
  );
}
