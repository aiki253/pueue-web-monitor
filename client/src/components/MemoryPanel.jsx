import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GaugeChart } from './GaugeChart';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

export function MemoryPanel({ memory, history }) {
  if (!memory) return null;

  const usedPercent = memory.total > 0
    ? Math.round((memory.used / memory.total) * 1000) / 10
    : 0;

  return (
    <div className="panel">
      <h2>Memory</h2>
      <GaugeChart value={usedPercent} label="Used" />
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginTop: 8,
        fontSize: '0.8rem',
        color: '#94a3b8',
      }}>
        <span>Used: {formatBytes(memory.used)}</span>
        <span>Total: {formatBytes(memory.total)}</span>
      </div>
      {memory.buffcache > 0 && (
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
          Active: {formatBytes(memory.active)} / Buff/Cache: {formatBytes(memory.buffcache)}
        </div>
      )}
      {memory.swapTotal > 0 && (
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
          Swap: {formatBytes(memory.swapUsed)} / {formatBytes(memory.swapTotal)}
        </div>
      )}
      <div style={{ width: '100%', height: 150, marginTop: 16 }}>
        <ResponsiveContainer>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={32}
            />
            <Tooltip
              labelFormatter={formatTime}
              formatter={(v) => [`${v.toFixed(1)}%`, 'Memory']}
              contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 6 }}
            />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="#a855f7"
              fill="url(#memGrad)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
