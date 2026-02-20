const path = require('path');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { getCpuData } = require('./collectors/cpu');
const { getMemoryData } = require('./collectors/memory');
const { getPueueData } = require('./collectors/pueue');
const { getSystemData } = require('./collectors/system');
const { History } = require('./history');
const autoscaler = require('./autoscaler');
const { execFile } = require('child_process');

const PUEUE_BIN = process.env.PUEUE_BIN || 'pueue';

const PORT = process.env.PORT || 10453;
const INTERVAL = 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const history = new History();

// Serve static files from built client
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Collect all metrics
async function collectData() {
  const [cpu, memory, pueue] = await Promise.all([
    getCpuData(),
    getMemoryData(),
    getPueueData(),
  ]);
  const system = getSystemData();

  const timestamp = new Date().toISOString();
  const memoryUsedPercent = memory.total > 0
    ? Math.round((memory.used / memory.total) * 1000) / 10
    : 0;

  history.push(timestamp, cpu.overall, memoryUsedPercent);

  // autoscaler の tick を CPU データで駆動
  await autoscaler.tick(cpu.overall);

  return { timestamp, cpu, memory, pueue, system, autoscaler: autoscaler.getState() };
}

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Handle new WebSocket connections
wss.on('connection', async (ws) => {
  try {
    const current = await collectData();
    ws.send(JSON.stringify({
      type: 'init',
      history: history.getAll(),
      current,
    }));
  } catch (err) {
    console.error('Error sending init data:', err.message);
  }

  // Client → Server メッセージハンドラ
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'set-parallel-mode') {
        await autoscaler.setMode(msg.mode);
        // 即座にpueueの最新状態を取得してブロードキャスト
        const pueue = await getPueueData();
        broadcast({ type: 'autoscaler', ...autoscaler.getState(), pueueGroups: pueue.groups });
      } else if (msg.type === 'set-parallel') {
        await autoscaler.setParallel(msg.value);
        // 即座にpueueの最新状態を取得してブロードキャスト
        const pueue = await getPueueData();
        broadcast({ type: 'autoscaler', ...autoscaler.getState(), pueueGroups: pueue.groups });
      } else if (msg.type === 'clean-tasks') {
        await new Promise((resolve) => {
          execFile(PUEUE_BIN, ['clean'], { timeout: 5000 }, resolve);
        });
        // clean後に最新データをブロードキャスト
        const data = await collectData();
        broadcast({ type: 'update', ...data });
      } else if (msg.type === 'get-task-log') {
        const taskId = String(Math.floor(Number(msg.taskId)));
        if (!taskId || isNaN(Number(taskId))) return;
        const log = await new Promise((resolve) => {
          execFile(PUEUE_BIN, ['log', taskId, '--lines', '80'], { timeout: 5000, maxBuffer: 1024 * 512 }, (err, stdout) => {
            resolve(stdout || (err ? `Error: ${err.message}` : 'No output'));
          });
        });
        ws.send(JSON.stringify({ type: 'task-log', taskId: Number(taskId), log }));
      }
    } catch (err) {
      console.error('WebSocket message error:', err.message);
    }
  });
});

// Periodic data collection and broadcast
let collecting = false;
setInterval(async () => {
  if (collecting) return;
  collecting = true;
  try {
    const data = await collectData();
    broadcast({ type: 'update', ...data });
  } catch (err) {
    console.error('Collection error:', err.message);
  } finally {
    collecting = false;
  }
}, INTERVAL);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Monitor server running on http://0.0.0.0:${PORT}`);
});
