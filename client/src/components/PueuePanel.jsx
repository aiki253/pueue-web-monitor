import React from 'react';

const STATUS_COLORS = {
  Running: '#3b82f6',
  Queued: '#eab308',
  Stashed: '#64748b',
  Paused: '#f97316',
  Done: '#22c55e',
  Locked: '#a855f7',
};

const RESULT_COLORS = {
  Success: '#22c55e',
  Failed: '#ef4444',
  Killed: '#f97316',
  DependencyFailed: '#ef4444',
};

function StatusBadge({ status, result }) {
  if (status === 'Done' && result) {
    const color = RESULT_COLORS[result] || '#64748b';
    return <span className="badge" style={{ background: color }}>{result}</span>;
  }
  const color = STATUS_COLORS[status] || '#64748b';
  return <span className="badge" style={{ background: color }}>{status}</span>;
}

function formatElapsed(startedAt) {
  if (!startedAt) return '-';
  const start = new Date(startedAt);
  const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
  if (elapsed < 0) return '-';
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return '-';
  const elapsed = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000);
  if (elapsed < 0) return '-';
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function PueuePanel({ pueue }) {
  if (!pueue) return null;

  const groupEntries = Object.entries(pueue.groups || {});

  return (
    <div className="panel panel-wide">
      <h2>Pueue Tasks</h2>
      {groupEntries.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {groupEntries.map(([name, g]) => (
            <div key={name} style={{
              padding: '4px 10px',
              background: '#2a2a3a',
              borderRadius: 6,
              fontSize: '0.75rem',
              color: '#94a3b8',
            }}>
              <strong>{name}</strong>: {g.status} ({g.parallel} parallel)
            </div>
          ))}
        </div>
      )}
      {pueue.tasks.length === 0 ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No tasks</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Command</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {pueue.tasks.map(task => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td><StatusBadge status={task.status} result={task.result} /></td>
                  <td className="command-cell" title={task.command}>{task.command}</td>
                  <td>
                    {task.status === 'Running'
                      ? formatElapsed(task.startedAt)
                      : formatDuration(task.startedAt, task.endedAt)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
