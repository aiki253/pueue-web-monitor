const si = require('systeminformation');

async function getMemoryData() {
  const mem = await si.mem();
  return {
    total: mem.total,
    used: mem.total - mem.available,
    active: mem.active,
    buffcache: mem.buffcache,
    available: mem.available,
    swapTotal: mem.swaptotal,
    swapUsed: mem.swapused,
  };
}

module.exports = { getMemoryData };
