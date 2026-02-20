const MAX_ENTRIES = 600; // 30 min at 3s interval

class History {
  constructor() {
    this.entries = [];
  }

  push(timestamp, cpuOverall, memoryUsedPercent) {
    this.entries.push({ timestamp, cpu: cpuOverall, memory: memoryUsedPercent });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
  }

  getAll() {
    return this.entries;
  }
}

module.exports = { History };
