function comparePlayers(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
  if (a.correctTimeMs !== b.correctTimeMs) return a.correctTimeMs - b.correctTimeMs;
  if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
  return String(a.playerId) < String(b.playerId) ? -1 : 1;
}

function rankPlayers(players) {
  return players
    .slice()
    .sort(comparePlayers)
    .map((p, index) => ({
      rank: index + 1,
      playerId: p.playerId,
      nickName: p.nickName,
      avatar: p.avatar,
      score: p.score || 0,
      correctCount: p.correctCount || 0,
      correctTimeMs: p.correctTimeMs || 0,
      left: !!p.left,
    }));
}

function rankScoreOf(input) {
  const score = Math.max(0, Number(input.score) || 0);
  const wins = Math.max(0, Number(input.wins) || 0);
  const bestScore = Math.max(0, Number(input.bestScore) || 0);
  return score * 1e8 + wins * 1e5 + bestScore;
}

module.exports = { comparePlayers, rankPlayers, rankScoreOf };
