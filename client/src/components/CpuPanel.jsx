import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GaugeChart } from './GaugeChart';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function CoreGrid({ cores }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
      gap: 3,
      marginTop: 12,
    }}>
      {cores.map((load, i) => {
        const color = load < 50 ? '#22c55e' : load < 80 ? '#eab308' : '#ef4444';
        const height = Math.max(4, (load / 100) * 28);
        return (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <div style={{
              width: '100%',
              height: 28,
              background: '#2a2a3a',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'flex-end',
            }}>
              <div style={{
                width: '100%',
                height,
                background: color,
                borderRadius: 3,
                transition: 'height 0.5s ease, background 0.5s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.55rem', color: '#64748b' }}>{i}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CpuPanel({ cpu, history }) {
  if (!cpu) return null;

  return (
    <div className="panel">
      <h2>CPU</h2>
      <GaugeChart value={cpu.overall} label="Overall" />
      <div style={{ width: '100%', height: 150, marginTop: 16 }}>
        <ResponsiveContainer>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
              formatter={(v) => [`${v.toFixed(1)}%`, 'CPU']}
              contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 6 }}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#3b82f6"
              fill="url(#cpuGrad)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <CoreGrid cores={cpu.cores} />
    </div>
  );
}
