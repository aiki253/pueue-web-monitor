const si = require('systeminformation');

async function getCpuData() {
  const load = await si.currentLoad();
  return {
    overall: Math.round(load.currentLoad * 10) / 10,
    cores: load.cpus.map(c => Math.round(c.load * 10) / 10),
  };
}

module.exports = { getCpuData };
