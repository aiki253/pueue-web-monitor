const { execFile } = require('child_process');

const PUEUE_BIN = process.env.PUEUE_BIN || 'pueue';

const CPU_LOW = 60;
const CPU_HIGH = 80;
const CPU_RESUME = 60;
const MIN_PARALLEL = 1;
const MAX_PARALLEL = 12;
const HISTORY_SIZE = 40; // 40 × 3s = 2分

let mode = 'manual'; // 'auto' | 'manual'
let pausedTasks = [];
let cpuHistory = [];
let cpuHistoryIdx = 0;
let lastMedian = null;
let lastAction = null; // ログ用

// --- pueue CLI helpers ---

function pueueExec(args, { force = false } = {}) {
  return new Promise((resolve) => {
    // Defense-in-depth: block auto-scaling commands in manual mode
    // Only user-initiated actions (force=true) can bypass this
    if (!force && mode === 'manual') {
      const cmd = args[0];
      if (cmd === 'parallel' || cmd === 'pause' || cmd === 'start') {
        console.log(`[autoscaler] BLOCKED in manual mode: pueue ${args.join(' ')}`);
        resolve('');
        return;
      }
    }
    execFile(PUEUE_BIN, args, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        console.error(`[autoscaler] pueue ${args.join(' ')} failed:`, err.message);
      }
      resolve(stdout || '');
    });
  });
}

async function getRunningTaskIds() {
  try {
    const stdout = await pueueExec(['status', '--json']);
    const data = JSON.parse(stdout);
    const ids = [];
    for (const [id, task] of Object.entries(data.tasks || {})) {
      if (task.status === 'Running' || (typeof task.status === 'object' && task.status.Running)) {
        ids.push(Number(id));
      }
    }
    return ids.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

async function getCurrentParallel() {
  try {
    const stdout = await pueueExec(['status', '--json']);
    const data = JSON.parse(stdout);
    const defaultGroup = data.groups?.default;
    return defaultGroup?.parallel_tasks ?? 1;
  } catch {
    return 1;
  }
}

// --- CPU median ---

function pushCpuHistory(cpu) {
  if (cpuHistory.length < HISTORY_SIZE) {
    cpuHistory.push(cpu);
  } else {
    cpuHistory[cpuHistoryIdx] = cpu;
  }
  cpuHistoryIdx = (cpuHistoryIdx + 1) % HISTORY_SIZE;
}

function getMedian() {
  const n = cpuHistory.length;
  if (n === 0) return null;
  const sorted = [...cpuHistory].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// --- Main tick (called every 3s from server) ---

async function tick(cpuOverall) {
  pushCpuHistory(cpuOverall);
  lastMedian = getMedian();
  lastAction = null;

  // await の間にモードが変わる可能性があるため、各操作前に再チェック
  if (mode !== 'auto') return;

  const cpu = cpuOverall;
  const median = lastMedian;
  const runningIds = await getRunningTaskIds();
  if (mode !== 'auto') return;
  const runningCount = runningIds.length;

  // 実行中タスクがなければ parallel=1 にリセット
  if (runningCount === 0) {
    const current = await getCurrentParallel();
    if (mode !== 'auto') return;
    if (current !== 1) {
      await pueueExec(['parallel', '1']);
      lastAction = 'No running tasks → parallel=1';
      console.log(`[autoscaler] ${lastAction}`);
    }
    return;
  }

  if (cpu > CPU_HIGH) {
    // --- 高負荷: 最新タスクを pause ---
    if (runningCount > MIN_PARALLEL) {
      const victim = runningIds[runningIds.length - 1];
      if (mode !== 'auto') return;
      await pueueExec(['pause', String(victim)]);
      pausedTasks.push(victim);
      const newPara = Math.max(runningCount - 1, MIN_PARALLEL);
      if (mode !== 'auto') return;
      await pueueExec(['parallel', String(newPara)]);
      lastAction = `PAUSE #${victim} → parallel=${newPara}`;
      console.log(`[autoscaler] CPU=${cpu}% ${lastAction}`);
    }
  } else if (median < CPU_RESUME && pausedTasks.length > 0) {
    // --- 回復 (中央値ベース): LIFO で resume ---
    const resumeId = pausedTasks.pop();
    if (mode !== 'auto') return;
    await pueueExec(['start', String(resumeId)]);
    const current = await getCurrentParallel();
    if (mode !== 'auto') return;
    const newPara = Math.min(current + 1, MAX_PARALLEL);
    await pueueExec(['parallel', String(newPara)]);
    lastAction = `RESUME #${resumeId} → parallel=${newPara}`;
    console.log(`[autoscaler] CPU=${cpu}% median=${median}% ${lastAction}`);
  } else if (median < CPU_LOW && pausedTasks.length === 0) {
    // --- 余裕あり: 並列数を上げる ---
    const current = await getCurrentParallel();
    if (mode !== 'auto') return;
    if (current < MAX_PARALLEL) {
      const newPara = current + 1;
      await pueueExec(['parallel', String(newPara)]);
      lastAction = `SCALE UP parallel=${newPara}`;
      console.log(`[autoscaler] CPU=${cpu}% median=${median}% ${lastAction}`);
    }
  }
}

// --- Mode / Parallel control ---

async function setMode(newMode) {
  if (newMode !== 'auto' && newMode !== 'manual') return;
  mode = newMode;
  console.log(`[autoscaler] mode → ${mode}`);

  // manual に切り替えたら pause 中のタスクを全て resume
  if (mode === 'manual' && pausedTasks.length > 0) {
    for (const id of pausedTasks) {
      await pueueExec(['start', String(id)], { force: true });
    }
    pausedTasks = [];
  }
}

async function setParallel(value) {
  if (mode !== 'manual') return;
  const n = Math.max(MIN_PARALLEL, Math.min(MAX_PARALLEL, Math.floor(value)));
  await pueueExec(['parallel', String(n)], { force: true });
  console.log(`[autoscaler] manual parallel → ${n}`);
}

function getState() {
  return {
    mode,
    pausedTasks: [...pausedTasks],
    cpuMedian: lastMedian,
    lastAction,
    config: { CPU_LOW, CPU_HIGH, CPU_RESUME, MIN_PARALLEL, MAX_PARALLEL },
  };
}

module.exports = { tick, setMode, setParallel, getState };
