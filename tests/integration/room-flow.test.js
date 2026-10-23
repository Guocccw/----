const test = require('node:test');
const assert = require('node:assert/strict');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class FakeDB {
  constructor(seed) {
    this.data = {};
    for (const name of Object.keys(seed || {})) {
      this.data[name] = new Map();
      for (const doc of seed[name]) this.data[name].set(doc._id, clone(doc));
    }
  }
  collection(name) {
    if (!this.data[name]) this.data[name] = new Map();
    return new FakeCollection(this, name);
  }
  startTransaction() {
    return new FakeTx(this);
  }
}

class FakeCollection {
  constructor(db, name) {
    this.db = db;
    this.name = name;
  }
  doc(id) {
    return new FakeDoc(this.db, this.name, id);
  }
  where(query) {
    return new FakeQuery(this.db, this.name, query);
  }
  limit(n) {
    return new FakeQuery(this.db, this.name, {}).limit(n);
  }
  async add({ data }) {
    const id = data._id || 'id_' + Math.random().toString(36).slice(2);
    this.db.data[this.name].set(id, clone(Object.assign({ _id: id }, data)));
    return { _id: id };
  }
}

class FakeDoc {
  constructor(db, name, id) {
    this.db = db;
    this.name = name;
    this.id = id;
  }
  async get() {
    if (!this.db.data[this.name] || !this.db.data[this.name].has(this.id)) {
      throw new Error('document does not exist');
    }
    return { data: clone(this.db.data[this.name].get(this.id)) };
  }
  async set({ data }) {
    this.db.data[this.name].set(this.id, clone(Object.assign({ _id: this.id }, data)));
    return {};
  }
  async update({ data }) {
    const cur = this.db.data[this.name].get(this.id);
    if (!cur) throw new Error('document does not exist');
    this.db.data[this.name].set(this.id, clone(Object.assign({}, cur, data)));
    return {};
  }
  async remove() {
    this.db.data[this.name].delete(this.id);
    return {};
  }
}

class FakeQuery {
  constructor(db, name, query) {
    this.db = db;
    this.name = name;
    this.query = query || {};
    this.max = 1000;
  }
  limit(n) {
    this.max = n;
    return this;
  }
  orderBy() {
    return this;
  }
  async get() {
    const all = Array.from(this.db.data[this.name].values());
    const filtered = all.filter((doc) =>
      Object.keys(this.query).every((key) => doc[key] === this.query[key])
    );
    return { data: filtered.slice(0, this.max).map(clone) };
  }
  async count() {
    const res = await this.get();
    return { total: res.data.length };
  }
  async remove() {
    const res = await this.get();
    for (const doc of res.data) this.db.data[this.name].delete(doc._id);
    return {};
  }
}

class FakeTx {
  constructor(db) {
    this.db = db;
    this.docs = new Map();
  }
  collection(name) {
    const tx = this;
    return {
      doc(id) {
        return {
          async get() {
            if (!tx.docs.has(name + '/' + id)) {
              const cur = tx.db.data[name] && tx.db.data[name].get(id);
              if (!cur) throw new Error('document does not exist');
              tx.docs.set(name + '/' + id, clone(cur));
            }
            return { data: clone(tx.docs.get(name + '/' + id)) };
          },
          async update({ data }) {
            const key = name + '/' + id;
            if (!tx.docs.has(key)) {
              const cur = tx.db.data[name] && tx.db.data[name].get(id);
              if (!cur) throw new Error('document does not exist');
              tx.docs.set(key, clone(cur));
            }
            tx.docs.set(key, clone(Object.assign({}, tx.docs.get(key), data)));
            return {};
          },
        };
      },
    };
  }
  async commit() {
    for (const [key, doc] of this.docs.entries()) {
      const [name, id] = key.split('/');
      this.db.data[name].set(id, clone(doc));
    }
    this.docs.clear();
  }
  async rollback() {
    this.docs.clear();
  }
}

function avatar(v) {
  return { type: 'emoji', value: v, bg: '#FFE3D5' };
}

function seed() {
  return {
    users: [
      {
        _id: 'oa',
        uid: 'aaaaaaaaaaaaaaaa',
        nickName: 'A',
        avatar: avatar('🍎'),
        stats: { games: 0, wins: 0, bestScore: 0, bestScoreAt: 0, totalCorrect: 0, totalAnswered: 0, totalPlayMs: 0 },
        settings: { sound: true, vibration: true, rankOptOut: false },
        activeRoomCode: null,
        rate: {},
      },
      {
        _id: 'ob',
        uid: 'bbbbbbbbbbbbbbbb',
        nickName: 'B',
        avatar: avatar('🍋'),
        stats: { games: 0, wins: 0, bestScore: 0, bestScoreAt: 0, totalCorrect: 0, totalAnswered: 0, totalPlayMs: 0 },
        settings: { sound: true, vibration: true, rankOptOut: false },
        activeRoomCode: null,
        rate: {},
      },
    ],
    questions: Array.from({ length: 10 }, (_, i) => ({
      _id: 'q' + i,
      category: 'general',
      stem: 'Q' + i,
      options: ['A', 'B', 'C', 'D'],
      answerIndex: 0,
      enabled: true,
    })),
    rooms: [],
    room_views: [],
    games: [],
    leaderboards_weekly: [],
    event_batches: [],
  };
}

test('云函数房间主流程（内存数据库）', async () => {
  const realNow = Date.now;
  let fakeNow = realNow();
  Date.now = () => fakeNow;

  try {
    const db = new FakeDB(seed());
    const room = require('../../cloudfunctions/api/actions/room');
    const ctxA = { db, openid: 'oa', now: fakeNow, _: {} };
    const ctxB = { db, openid: 'ob', now: fakeNow, _: {} };

    const created = await room.create(
      { config: { questionCount: 10, durationSec: 15, category: 'general' } },
      ctxA
    );
    assert.equal(created.view.status, 'waiting');
    assert.equal(created.view.players.length, 1);
    const code = created.view.roomCode;

    const joined = await room.join({ roomCode: code }, ctxB);
    assert.equal(joined.view.players.length, 2);

    const started = await room.start({ roomCode: code }, ctxA);
    assert.equal(started.view.status, 'playing');
    assert.equal(started.view.round.correctIndex, null);

    fakeNow = started.view.round.startedAt + 1000;
    const a1 = await room.answer({ roomCode: code, roundIndex: 0, choice: 0 }, ctxA);
    assert.equal(a1.view.round.myChoice, 0);
    const b1 = await room.answer({ roomCode: code, roundIndex: 0, choice: 0 }, ctxB);
    assert.equal(b1.view.round.correctIndex, 0);

    fakeNow = b1.view.round.revealEndsAt + 400;
    let current = await room.advance({ roomCode: code, roundIndex: 0 }, ctxA);
    assert.equal(current.view.round.index, 1);

    for (let i = 1; i < 10; i++) {
      fakeNow = current.view.round.startedAt + 1000;
      await room.answer({ roomCode: code, roundIndex: i, choice: 0 }, ctxA);
      const last = await room.answer({ roomCode: code, roundIndex: i, choice: 0 }, ctxB);
      fakeNow = last.view.round.revealEndsAt + 400;
      current = await room.advance({ roomCode: code, roundIndex: i }, ctxA);
    }

    assert.equal(current.view.status, 'settled');
    assert.equal(current.view.final.rankings.length, 2);
    assert.ok(current.view.final.winnerId);
    assert.ok(db.data.games.size >= 1);
    assert.equal(db.data.leaderboards_weekly.size, 2);
    assert.equal(db.data.users.get('oa').stats.games, 1);
    assert.equal(db.data.users.get('oa').stats.totalCorrect, 10);

    const rematched = await room.rematch({ roomCode: code }, ctxA);
    assert.equal(rematched.view.status, 'waiting');
    assert.equal(rematched.view.players.length, 2);
    assert.equal(rematched.view.players.every((p) => p.score === 0), true);

    const left = await room.leave({ roomCode: code }, ctxB);
    assert.equal(left.left, true);
    assert.equal(db.data.rooms.get(code).players.length, 1);
    assert.equal(db.data.users.get('ob').activeRoomCode, null);
    assert.equal(db.data.room_views.size, 1);
  } finally {
    Date.now = realNow;
  }
});
