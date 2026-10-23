const cloud = require('wx-server-sdk');
const questions = require('./questions.json');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = [
  'users',
  'rooms',
  'room_views',
  'games',
  'questions',
  'leaderboards_weekly',
  'event_batches',
];

function messageOf(err) {
  return String((err && (err.errMsg || err.message)) || '');
}

async function ensureCollection(name) {
  try {
    if (typeof db.createCollection === 'function') {
      await db.createCollection(name);
      return 'created';
    }
  } catch (err) {
    const msg = messageOf(err);
    if (/already exist|已存在|DATABASE_COLLECTION_EXIST/i.test(msg)) return 'exists';
    // fall through to probe
  }
  try {
    const probe = await db.collection(name).add({ data: { __setup: true, at: Date.now() } });
    if (probe && probe._id) await db.collection(name).doc(probe._id).remove();
    return 'created';
  } catch (err) {
    const msg = messageOf(err);
    if (/already exist|已存在|DATABASE_COLLECTION_EXIST/i.test(msg)) return 'exists';
    throw err;
  }
}

exports.main = async () => {
  const result = { collections: {}, questions: 0, skipped: false };
  for (const name of COLLECTIONS) {
    result.collections[name] = await ensureCollection(name);
  }

  let count = 0;
  try {
    const c = await db.collection('questions').count();
    count = c.total || 0;
  } catch (err) {
    count = 0;
  }
  if (count > 0) {
    result.skipped = true;
    return result;
  }

  for (const q of questions) {
    const payload = Object.assign({}, q);
    delete payload._id;
    await db.collection('questions').doc(q._id).set({ data: payload });
    result.questions += 1;
  }
  return result;
};
