function formatScore(n) {
  return String(Math.max(0, Math.round(Number(n) || 0)));
}

function formatDuration(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 1000) return '0.0s';
  return (value / 1000).toFixed(1) + 's';
}

function formatPercent(part, total) {
  if (!total) return '0%';
  return Math.round((part / total) * 100) + '%';
}

function formatWeekRange(weekStartAt, weekEndAt) {
  if (!weekStartAt || !weekEndAt) return '';
  const start = new Date(weekStartAt);
  const end = new Date(weekEndAt);
  const fmt = (d) => (d.getMonth() + 1) + '.' + d.getDate();
  return '本周 ' + fmt(start) + ' – ' + fmt(end);
}

function avatarEmoji(avatar) {
  if (avatar && avatar.type === 'emoji' && avatar.value) return avatar.value;
  return '🍎';
}

function avatarBg(avatar) {
  if (avatar && avatar.bg) return avatar.bg;
  return '#FFE3D5';
}

module.exports = { formatScore, formatDuration, formatPercent, formatWeekRange, avatarEmoji, avatarBg };
