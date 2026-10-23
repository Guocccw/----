const BASE_SCORE = 100;
const MAX_SPEED_BONUS = 50;

function scoreAnswer(input) {
  if (!input || !input.correct) return 0;
  const duration = Math.max(1, Number(input.durationMs) || 1);
  const remaining = Math.max(0, Math.min(duration, Number(input.endsAt) - Number(input.submittedAt)));
  const speed = Math.round((MAX_SPEED_BONUS * remaining) / duration);
  return BASE_SCORE + Math.max(0, Math.min(MAX_SPEED_BONUS, speed));
}

module.exports = { BASE_SCORE, MAX_SPEED_BONUS, scoreAnswer };
