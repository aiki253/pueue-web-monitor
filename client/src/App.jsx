import React, { useState } from 'react';
import { useMonitorData } from './hooks/useMonitorData';
import { OverviewPage } from './components/OverviewPage';
import { CpuPanel } from './components/CpuPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { PueuePanel } from './components/PueuePanel';
import { PueuePage } from './components/PueuePage';
import './App.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'detail', label: 'Detail' },
  { id: 'pueue', label: 'Pueue' },
];

export default function App() {
  const { data, history, connected, autoscalerState, sendMessage, taskLogs } = useMonitorData();
  const [tab, setTab] = useState('overview');

  return (
    <div className="app">
      <header>
        <h1>PC Monitor</h1>
        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        <nav className="tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'overview' && (
        <main>
          <OverviewPage data={data} history={history} />
        </main>
      )}

      {tab === 'detail' && (
        <main className="dashboard">
          <CpuPanel cpu={data?.cpu} history={history} />
          <MemoryPanel memory={data?.memory} history={history} />
          <PueuePanel pueue={data?.pueue} />
        </main>
      )}

      {tab === 'pueue' && (
        <main>
          <PueuePage pueue={data?.pueue} autoscaler={autoscalerState} sendMessage={sendMessage} taskLogs={taskLogs} />
        </main>
      )}
    </div>
  );
}
