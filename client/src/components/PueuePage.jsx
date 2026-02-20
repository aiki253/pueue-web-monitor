import React, { useState } from 'react';

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

const FILTERS = ['All', 'Running', 'Queued', 'Paused', 'Success', 'Failed'];

function ParallelControl({ autoscaler, sendMessage, pueue }) {
  const isAuto = autoscaler?.mode === 'auto';
  const groups = pueue?.groups || {};
  const defaultGroup = groups.default || groups[Object.keys(groups)[0]];
  const currentParallel = defaultGroup?.parallel ?? '?';
  const config = autoscaler?.config || {};

  return (
    <div className="parallel-control">
      <div className="parallel-control-row">
        <span className="parallel-control-label">Parallel</span>
        <div className="parallel-mode-toggle">
          <button
            className={`parallel-mode-btn ${!isAuto ? 'active' : ''}`}
            onClick={() => sendMessage({ type: 'set-parallel-mode', mode: 'manual' })}
          >
            MANUAL
          </button>
          <button
            className={`parallel-mode-btn ${isAuto ? 'active' : ''}`}
            onClick={() => sendMessage({ type: 'set-parallel-mode', mode: 'auto' })}
          >
            AUTO
          </button>
        </div>
        <div className="parallel-value-control">
          {!isAuto && (
            <button
              className="parallel-adj-btn"
              onClick={() => sendMessage({ type: 'set-parallel', value: currentParallel - 1 })}
              disabled={currentParallel <= (config.MIN_PARALLEL || 1)}
            >
              -
            </button>
          )}
          <span className="parallel-value">{currentParallel}</span>
          {!isAuto && (
            <button
              className="parallel-adj-btn"
              onClick={() => sendMessage({ type: 'set-parallel', value: currentParallel + 1 })}
              disabled={currentParallel >= (config.MAX_PARALLEL || 12)}
            >
              +
            </button>
          )}
        </div>
      </div>
      {isAuto && autoscaler && (
        <div className="parallel-auto-info">
          {autoscaler.cpuMedian != null && (
            <span className="parallel-info-chip">CPU median: {autoscaler.cpuMedian}%</span>
          )}
          {autoscaler.pausedTasks.length > 0 && (
            <span className="parallel-info-chip paused">Paused: {autoscaler.pausedTasks.length} tasks</span>
          )}
          {autoscaler.lastAction && (
            <span className="parallel-info-chip action">{autoscaler.lastAction}</span>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function PueuePage({ pueue, autoscaler, sendMessage, taskLogs }) {
  const [filter, setFilter] = useState('All');
  const [expandedTask, setExpandedTask] = useState(null);

  if (!pueue) return <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Waiting for data...</div>;

  const groupEntries = Object.entries(pueue.groups || {});

  const filteredTasks = pueue.tasks.filter(task => {
    if (filter === 'All') return true;
    if (filter === 'Success') return task.status === 'Done' && task.result === 'Success';
    if (filter === 'Failed') return task.status === 'Done' && task.result === 'Failed';
    return task.status === filter;
  });

  const counts = {
    All: pueue.tasks.length,
    Running: pueue.tasks.filter(t => t.status === 'Running').length,
    Queued: pueue.tasks.filter(t => t.status === 'Queued').length,
    Paused: pueue.tasks.filter(t => t.status === 'Paused').length,
    Success: pueue.tasks.filter(t => t.status === 'Done' && t.result === 'Success').length,
    Failed: pueue.tasks.filter(t => t.status === 'Done' && t.result === 'Failed').length,
  };

  return (
    <div>
      <ParallelControl autoscaler={autoscaler} sendMessage={sendMessage} pueue={pueue} />

      {groupEntries.length > 0 && (
        <div className="pueue-groups">
          {groupEntries.map(([name, g]) => (
            <div key={name} className="pueue-group-badge">
              <strong>{name}</strong>: {g.status} ({g.parallel} parallel)
            </div>
          ))}
        </div>
      )}

      <div className="pueue-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`pueue-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f} <span className="pueue-filter-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>No tasks</div>
      ) : (
        <div className="pueue-task-list">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTask === task.id}
              log={taskLogs?.[task.id]}
              onToggle={() => {
                if (expandedTask === task.id) {
                  setExpandedTask(null);
                } else {
                  setExpandedTask(task.id);
                  sendMessage({ type: 'get-task-log', taskId: task.id });
                }
              }}
            />
          ))}
        </div>
      )}

      {pueue.tasks.some(t => t.status === 'Done') && (
        <button
          className="pueue-clean-btn"
          onClick={() => sendMessage({ type: 'clean-tasks' })}
        >
          Clean finished tasks
        </button>
      )}
    </div>
  );
}

function TaskCard({ task, expanded, log, onToggle }) {
  const isRunning = task.status === 'Running';

  return (
    <div
      className={`pueue-card ${isRunning ? 'pueue-card-running' : ''} ${expanded ? 'pueue-card-expanded' : ''}`}
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
    >
      <div className="pueue-card-header">
        <span className="pueue-card-id">#{task.id}</span>
        <StatusBadge status={task.status} result={task.result} />
        <span className="pueue-card-duration">
          {isRunning
            ? formatElapsed(task.startedAt)
            : formatDuration(task.startedAt, task.endedAt)
          }
        </span>
      </div>
      <pre className="pueue-card-command">{task.command}</pre>
      <div className="pueue-card-times">
        {task.startedAt && <span>Start: {formatTime(task.startedAt)}</span>}
        {task.endedAt && <span>End: {formatTime(task.endedAt)}</span>}
      </div>
      {task.path && (
        <div className="pueue-card-path">{task.path}</div>
      )}
      {expanded && (
        <pre className="pueue-card-log">{log ?? 'Loading...'}</pre>
      )}
    </div>
  );
}
