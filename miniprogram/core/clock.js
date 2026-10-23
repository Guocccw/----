let offset = 0;
const samples = [];
const MAX_SAMPLES = 5;

function sync(serverTime, t0, t1) {
  if (!serverTime) return offset;
  const sample = serverTime - (t0 + t1) / 2;
  if (samples.length && Math.abs(sample - offset) > 5000) {
    samples.length = 0;
  }
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
  const sorted = samples.slice().sort((a, b) => a - b);
  offset = sorted[Math.floor(sorted.length / 2)];
  return offset;
}

function now() {
  return Date.now() + offset;
}

function reset() {
  offset = 0;
  samples.length = 0;
}

function getOffset() {
  return offset;
}

module.exports = { sync, now, reset, getOffset };
