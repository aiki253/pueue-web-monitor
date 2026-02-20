import React from 'react';

function getColor(value) {
  if (value < 50) return '#22c55e';
  if (value < 80) return '#eab308';
  return '#ef4444';
}

export function GaugeChart({ value, label, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = getColor(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#2a2a3a" strokeWidth="10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div style={{
        marginTop: -size / 2 - 14,
        fontSize: '1.4rem',
        fontWeight: 'bold',
        color,
        textAlign: 'center',
        height: size / 2 + 14,
        display: 'flex',
        alignItems: 'center',
      }}>
        {value.toFixed(1)}%
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>{label}</div>
    </div>
  );
}
