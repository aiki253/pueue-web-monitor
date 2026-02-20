const os = require('os');

function getSystemData() {
  const upSec = os.uptime();
  const days = Math.floor(upSec / 86400);
  const hours = Math.floor((upSec % 86400) / 3600);
  const minutes = Math.floor((upSec % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  const loadavg = os.loadavg();

  return {
    hostname: os.hostname(),
    uptime: parts.join(' '),
    uptimeSeconds: upSec,
    loadavg: {
      '1m': Math.round(loadavg[0] * 100) / 100,
      '5m': Math.round(loadavg[1] * 100) / 100,
      '15m': Math.round(loadavg[2] * 100) / 100,
    },
    cpuCount: os.cpus().length,
  };
}

module.exports = { getSystemData };
