const { execFile } = require('child_process');

const PUEUE_BIN = process.env.PUEUE_BIN || 'pueue';

function getPueueData() {
  return new Promise((resolve) => {
    execFile(PUEUE_BIN, ['status', '--json'], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve({ groups: {}, tasks: [] });
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const groups = {};
        for (const [name, group] of Object.entries(data.groups || {})) {
          groups[name] = {
            status: group.status,
            parallel: group.parallel_tasks,
          };
        }

        const tasks = Object.values(data.tasks || {}).map(task => {
          const statusInfo = parseStatus(task.status);
          return {
            id: task.id,
            status: statusInfo.label,
            command: task.command,
            path: task.path,
            startedAt: statusInfo.start,
            endedAt: statusInfo.end,
            result: statusInfo.result,
          };
        });

        tasks.sort((a, b) => b.id - a.id);
        resolve({ groups, tasks });
      } catch {
        resolve({ groups: {}, tasks: [] });
      }
    });
  });
}

function parseStatus(status) {
  if (typeof status === 'string') {
    return { label: status, start: null, end: null, result: null };
  }
  if (status.Done) {
    return {
      label: 'Done',
      start: status.Done.start,
      end: status.Done.end,
      result: status.Done.result,
    };
  }
  if (status.Running) {
    return {
      label: 'Running',
      start: status.Running.start,
      end: null,
      result: null,
    };
  }
  // Paused: { Paused: { Running: { start: "..." } } }
  if (status.Paused) {
    const inner = status.Paused;
    const start = inner?.Running?.start || null;
    return { label: 'Paused', start, end: null, result: null };
  }
  const key = Object.keys(status)[0];
  return { label: key || 'Unknown', start: null, end: null, result: null };
}

module.exports = { getPueueData };
