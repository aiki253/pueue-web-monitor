import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { GaugeChart } from './GaugeChart';

function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

function StatCard({ label, value, color, sub }) {
  return (
    <div className="ov-stat">
      <div className="ov-stat-value" style={{ color }}>{value}</div>
      <div className="ov-stat-label">{label}</div>
      {sub && <div className="ov-stat-sub">{sub}</div>}
    </div>
  );
}

function MiniChart({ data, dataKey, color }) {
  if (!data || data.length < 2) return null;
  return (
    <div style={{ width: '100%', height: 48 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`mini-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#mini-${dataKey})`}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const PUEUE_STATUS_COLORS = {
  Running: '#3b82f6',
  Queued: '#eab308',
  Success: '#22c55e',
  Failed: '#ef4444',
};

function formatElapsed(startedAt) {
  if (!startedAt) return '';
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (elapsed < 0) return '';
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function OverviewPage({ data, history }) {
  if (!data) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: 60 }}>Connecting...</div>;
  }

  const { cpu, memory, pueue, system } = data;

  const memPercent = memory.total > 0
    ? Math.round((memory.used / memory.total) * 1000) / 10
    : 0;

  const running = pueue?.tasks?.filter(t => t.status === 'Running') || [];
  const queued = pueue?.tasks?.filter(t => t.status === 'Queued') || [];
  const succeeded = pueue?.tasks?.filter(t => t.status === 'Done' && t.result === 'Success') || [];
  const failed = pueue?.tasks?.filter(t => t.status === 'Done' && t.result === 'Failed') || [];

  return (
    <div className="ov">
      {/* System info bar */}
      {system && (
        <div className="ov-sysbar">
          <span className="ov-sysbar-host">{system.hostname}</span>
          <span className="ov-sysbar-item">Uptime: {system.uptime}</span>
          <span className="ov-sysbar-item">Load: {system.loadavg['1m']} / {system.loadavg['5m']} / {system.loadavg['15m']}</span>
          <span className="ov-sysbar-item">{system.cpuCount} cores</span>
        </div>
      )}

      {/* Gauges row */}
      <div className="ov-gauges">
        <div className="ov-gauge-card">
          <GaugeChart value={cpu.overall} label="CPU" size={140} />
          <MiniChart data={history} dataKey="cpu" color="#3b82f6" />
        </div>
        <div className="ov-gauge-card">
          <GaugeChart value={memPercent} label="Memory" size={140} />
          <div className="ov-mem-detail">
            {formatBytes(memory.used)} / {formatBytes(memory.total)}
          </div>
          {memory.buffcache > 0 && (
            <div className="ov-mem-sub">
              Active: {formatBytes(memory.active)} / Buff/Cache: {formatBytes(memory.buffcache)}
            </div>
          )}
          <MiniChart data={history} dataKey="memory" color="#a855f7" />
        </div>
      </div>

      {/* Pueue summary */}
      <div className="ov-pueue-summary">
        <StatCard label="Running" value={running.length} color={PUEUE_STATUS_COLORS.Running} />
        <StatCard label="Queued" value={queued.length} color={PUEUE_STATUS_COLORS.Queued} />
        <StatCard label="Success" value={succeeded.length} color={PUEUE_STATUS_COLORS.Success} />
        <StatCard label="Failed" value={failed.length} color={PUEUE_STATUS_COLORS.Failed} />
      </div>

      {/* Running tasks */}
      {running.length > 0 && (
        <div className="ov-running">
          <h3 className="ov-section-title">Running Tasks</h3>
          {running.map(task => (
            <div key={task.id} className="ov-running-item">
              <span className="ov-running-id">#{task.id}</span>
              <span className="ov-running-cmd">{task.command}</span>
              <span className="ov-running-elapsed">{formatElapsed(task.startedAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Queued tasks */}
      {queued.length > 0 && (
        <div className="ov-queued">
          <h3 className="ov-section-title">Queued</h3>
          {queued.map(task => (
            <div key={task.id} className="ov-queued-item">
              <span className="ov-running-id">#{task.id}</span>
              <span className="ov-running-cmd">{task.command}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
