const { AppError } = require('./errors');

function isValidQuestion(q) {
  if (!q || typeof q.stem !== 'string') return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (new Set(q.options.map((x) => String(x).trim())).size !== 4) return false;
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) return false;
  return true;
}

async function drawQuestions(db, config) {
  // 小体量题库直接全量读取后过滤，避免首版依赖复合索引。
  const res = await db.collection('questions').limit(1000).get();
  const category = config.category || 'general';
  const pool = (res.data || []).filter(
    (q) => q.enabled !== false && (q.category || 'general') === category && isValidQuestion(q)
  );
  if (pool.length < config.questionCount) {
    throw new AppError('QUESTION_NOT_ENOUGH', {
      available: pool.length,
      required: config.questionCount,
    });
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, config.questionCount).map((q) => ({
    _id: q._id,
    stem: q.stem,
    options: q.options,
    answerIndex: q.answerIndex,
    explain: q.explain || null,
  }));
}

module.exports = { isValidQuestion, drawQuestions };
