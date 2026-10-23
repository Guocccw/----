const ui = require('./ui');
const { COLORS, formatScore, formatDuration, avatarOf, avatarText, avatarBg } = require('./core');

const C = COLORS;

function statusLabel(status) {
  if (status === 'playing') return '对局中';
  if (status === 'settled') return '已结束';
  if (status === 'waiting') return '等待中';
  return '房间';
}

function continueLabel(status) {
  return status === 'settled' ? '查看结算' : '继续游戏';
}

function scoreOf(view) {
  if (!view) return 0;
  const me = (view.players || []).find((p) => p.playerId === view.playerId);
  return me ? me.score || 0 : 0;
}

function home(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);

  let y = ui.safeTop() + r(52);
  ui.text('果果答题', x, y, { size: 62, weight: '700' });
  ui.text('🍋', W - r(104), y - r(8), { size: 96 });
  ui.text('🍇', W - r(190), y + r(74), { size: 66 });
  y += r(78);
  ui.text('四个人，一道题，看谁手快', x, y, { size: 28, color: C.text2 });
  y += r(40);
  ui.text('不用匹配，喊上朋友就能开', x, y, { size: 26, color: C.text2 });

  y += r(92);
  ui.button(app, 'home.create', '＋ 创建房间', x, y, W - r(64), r(96), { size: 34 });
  y += r(112);
  ui.button(app, 'home.join', '加入房间', x, y, W - r(64), r(88), { variant: 'secondary' });

  y += r(112);
  const room = app.state.activeRoom;
  if (room) {
    ui.card(x, y, W - r(64), r(132));
    ui.fillRound(x, y, r(8), r(132), r(4), C.primary);
    ui.text('房间 ' + room.roomCode, x + r(28), y + r(24), { size: 32, weight: '700' });
    const chipW = r(96);
    ui.chip(statusLabel(room.status), W - r(64) - r(28) - chipW, y + r(20), {
      fill: room.status === 'settled' ? '#F6ECE3' : C.primarySoft,
      color: room.status === 'settled' ? C.text2 : C.primaryInk,
    });
    ui.text(continueLabel(room.status) + '  →', x + r(28), y + r(88), { size: 26, color: C.primaryInk, baseline: 'middle' });
    ui.hit(app, 'home.active', x, y, W - r(64), r(132));
    y += r(156);
  } else {
    y += r(8);
  }

  const user = app.state.user || {};
  const stats = user.stats || {};
  ui.text('累计 ' + (stats.games || 0) + ' 局 · 最佳 ' + (stats.bestScore || 0) + ' 分', W / 2, y + r(8), {
    size: 24,
    color: C.text2,
    align: 'center',
  });

  const fy = H - ui.safeBottom() - r(104) - r(56);
  ui.text('玩法说明', W / 2 - r(96), fy, { size: 22, color: C.text2, align: 'center' });
  ui.text('隐私协议', W / 2 + r(16), fy, { size: 22, color: C.text2, align: 'center' });
  ui.hit(app, 'home.rules', W / 2 - r(130), fy - r(8), r(110), r(40));
  ui.hit(app, 'home.privacy', W / 2 + r(2), fy - r(8), r(110), r(40));

  ui.footer(app, 'nav.home');
}

function create(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const compact = H < 700;
  ui.back(app, 'create.back');
  let y = ui.safeTop() + r(compact ? 72 : 112);
  ui.text('开一局？', x, y, { size: 44, weight: '600' });
  ui.text('选好节奏，朋友马上到', x, y + r(52), { size: 26, color: C.text2 });

  const counts = [10, 15, 20];
  const durations = [10, 15, 20];
  const gap = r(12);
  const cw = (W - r(64) - gap * 2) / 3;

  y += r(compact ? 96 : 124);
  ui.text('题目数量', x, y, { size: 30, weight: '600' });
  y += r(44);
  counts.forEach((value, i) => {
    const cx = x + i * (cw + gap);
    const selected = app.state.create.count === value;
    ui.card(cx, y, cw, r(compact ? 86 : 104), {
      fill: selected ? C.primarySoft : C.surface2,
      stroke: selected ? C.primary : C.border,
      shadow: false,
      radius: r(24),
    });
    ui.text(String(value), cx + cw / 2, y + r(14), { size: 32, weight: '700', align: 'center' });
    const desc = value === 10 ? '约 3 分钟' : value === 15 ? '约 5 分钟' : '硬核长局';
    ui.text(desc, cx + cw / 2, y + r(compact ? 52 : 62), { size: 20, color: C.text2, align: 'center' });
    ui.hit(app, 'create.count', cx, y, cw, r(compact ? 86 : 104), value);
  });

  y += r(compact ? 122 : 148);
  ui.text('每题时长', x, y, { size: 30, weight: '600' });
  y += r(44);
  durations.forEach((value, i) => {
    const cx = x + i * (cw + gap);
    const selected = app.state.create.duration === value;
    ui.card(cx, y, cw, r(compact ? 86 : 104), {
      fill: selected ? C.primarySoft : C.surface2,
      stroke: selected ? C.primary : C.border,
      shadow: false,
      radius: r(24),
    });
    ui.text(value + 's', cx + cw / 2, y + r(compact ? 14 : 18), { size: 32, weight: '700', align: 'center' });
    const desc = value === 10 ? '紧张' : value === 15 ? '适中' : '从容';
    ui.text(desc, cx + cw / 2, y + r(compact ? 52 : 62), { size: 20, color: C.text2, align: 'center' });
    ui.hit(app, 'create.duration', cx, y, cw, r(compact ? 86 : 104), value);
  });

  y += r(compact ? 122 : 148);
  const total = app.state.create.count * (app.state.create.duration + 4);
  const minutes = Math.max(1, Math.round(total / 60));
  ui.card(x, y, W - r(64), r(compact ? 64 : 72), { fill: C.surface2, shadow: false, radius: r(20), stroke: C.border });
  ui.text('⏱  预计 ' + minutes + ' 分钟 · 最多 4 人', x + r(24), y + r(compact ? 16 : 20), { size: 26, color: C.text2 });

  ui.button(app, 'create.submit', '创建并邀请', x, H - ui.safeBottom() - r(compact ? 104 : 128), W - r(64), r(96), {
    size: 32,
    disabled: app.state.loading,
  });
}

function join(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const compact = H < 700;
  ui.back(app, 'join.back');
  let y = ui.safeTop() + r(compact ? 72 : 112);
  ui.text('输入房间码', x, y, { size: 44, weight: '600' });
  ui.text('让朋友把 6 位房间码发给你', x, y + r(52), { size: 26, color: C.text2 });

  y += r(compact ? 92 : 124);
  const gap = compact ? r(8) : r(12);
  const cw = (W - r(64) - gap * 5) / 6;
  const codeH = compact ? r(88) : r(112);
  const code = app.state.joinCode || '';
  for (let i = 0; i < 6; i++) {
    const cx = x + i * (cw + gap);
    ui.card(cx, y, cw, codeH, {
      fill: code[i] ? C.surface2 : C.surface,
      stroke: code[i] ? C.primary : C.border,
      shadow: false,
      radius: r(20),
    });
    if (code[i]) ui.text(code[i], cx + cw / 2, y + codeH / 2, { size: compact ? 36 : 44, weight: '700', align: 'center', baseline: 'middle' });
  }

  y += r(compact ? 104 : 132);
  if (app.state.joinError) {
    ui.text(app.state.joinError, x, y, { size: 24, color: C.dangerInk });
  } else {
    ui.text('房间码在分享卡片里，也可以直接输入', x, y, { size: 24, color: C.text2 });
  }

  y += r(compact ? 40 : 52);
  const kw = (W - r(64) - gap * 2) / 3;
  const keyH = compact ? r(70) : r(88);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'submit'];
  keys.forEach((key, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const kx = x + col * (kw + gap);
    const ky = y + row * (keyH + gap);
    if (key === 'submit') {
      ui.button(app, 'join.submit', '加入', kx, ky, kw, keyH, {
        size: 30,
        disabled: code.length !== 6 || app.state.loading,
      });
    } else {
      ui.card(kx, ky, kw, keyH, { fill: C.surface, shadow: false, radius: r(20), stroke: C.border });
      const label = key === 'del' ? '删除' : key;
      ui.text(label, kx + kw / 2, ky + keyH / 2, { size: key === 'del' ? 24 : 32, weight: '600', align: 'center', baseline: 'middle' });
      ui.hit(app, key === 'del' ? 'join.del' : 'join.key', kx, ky, kw, keyH, key);
    }
  });

  ui.text('从聊天卡片进入会自动填入', W / 2, H - ui.safeBottom() - r(48), {
    size: 22,
    color: C.text3,
    align: 'center',
  });
}

function room(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const view = app.state.view;
  if (!view) {
    ui.header('房间', '加载中…');
    return;
  }
  ui.back(app, 'room.back');
  ui.text('房间码', W / 2, ui.safeTop() + r(28), { size: 24, color: C.text2, align: 'center' });
  ui.text(view.roomCode, W / 2, ui.safeTop() + r(58), { size: 64, weight: '700', align: 'center' });

  const copyW = r(120);
  ui.button(app, 'room.copy', '复制', W - r(32) - copyW * 2 - r(12), ui.safeTop() + r(124), copyW, r(56), {
    variant: 'ghost',
    size: 24,
  });
  ui.button(app, 'room.share', '分享', W - r(32) - copyW, ui.safeTop() + r(124), copyW, r(56), {
    variant: 'secondary',
    size: 24,
  });

  let y = ui.safeTop() + r(190);
  ui.chip(view.config.questionCount + ' 题', x, y, { fill: C.surface, color: C.text2 });
  ui.chip(view.config.durationSec + ' 秒/题', x + r(132), y, { fill: C.surface, color: C.text2 });
  ui.chip('最多 4 人', x + r(300), y, { fill: C.surface, color: C.text2 });

  y += r(80);
  const gap = r(20);
  const sw = (W - r(64) - gap) / 2;
  const sh = r(176);
  const players = (view.players || []).slice().sort((a, b) => a.seat - b.seat);
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = x + col * (sw + gap);
    const sy = y + row * (sh + gap);
    const p = players[i];
    if (p) {
      ui.card(sx, sy, sw, sh, {
        fill: C.surface,
        stroke: p.playerId === view.playerId ? C.primary : 'transparent',
        shadow: true,
        radius: r(28),
      });
      if (p.isOwner) {
        const ow = r(58);
        const ox = sx + sw - ow - r(12);
        ui.fillRound(ox, sy + r(12), ow, r(32), r(16), C.primarySoft);
        ui.text('房主', ox + ow / 2, sy + r(28), {
          size: 18,
          weight: '600',
          color: C.primaryInk,
          align: 'center',
          baseline: 'middle',
        });
      }
      ui.avatar(p.avatar, sx + sw / 2 - r(48), sy + r(16), r(96), {
        ring: p.playerId === view.playerId,
      });
      ui.text(p.nickName, sx + sw / 2, sy + r(120), { size: 26, weight: '600', align: 'center', maxWidth: sw - r(24) });
      const online = app.now() - (p.lastSeenAt || 0) < 45000 && !p.left;
      let statusText = online ? '已加入' : '离线';
      if (p.left) statusText = '已离开';
      ui.text(statusText, sx + sw / 2, sy + r(150), { size: 20, color: C.text2, align: 'center' });
    } else {
      ui.card(sx, sy, sw, sh, { fill: C.surface2, shadow: false, radius: r(28), stroke: '#E6D5C7' });
      ui.text('＋', sx + sw / 2, sy + r(64), { size: 40, color: C.text2, align: 'center', baseline: 'middle' });
      ui.text('邀请好友', sx + sw / 2, sy + r(112), { size: 24, color: C.text2, align: 'center' });
      ui.hit(app, 'room.share', sx, sy, sw, sh);
    }
  }

  const active = (view.players || []).filter((p) => !p.left).length;
  const owner = !!view.isOwner;
  const by = H - ui.safeBottom() - r(152);
  if (owner) {
    ui.button(app, 'room.start', '开始游戏', x, by, W - r(64), r(96), {
      size: 32,
      disabled: active === 1 || app.state.loading,
    });
    ui.text(active === 1 ? '再邀请 1 位好友就能开始' : '人齐了，可以开始了', W / 2, by + r(104), {
      size: 22,
      color: C.text2,
      align: 'center',
    });
  } else {
    ui.button(app, 'room.share', '邀请好友', x, by, W - r(64), r(88), { variant: 'secondary' });
    ui.text('等待房主开始', W / 2, by + r(100), { size: 22, color: C.text2, align: 'center' });
  }
  ui.text('离开房间', W / 2, by + r(148), { size: 26, color: C.dangerInk, align: 'center' });
  ui.hit(app, 'room.leave', W / 2 - r(90), by + r(138), r(180), r(48));
}

function optionState(app, index) {
  const view = app.state.view;
  const round = view && view.round;
  if (!round) return 'default';
  const settled = round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
  if (settled) {
    if (index === round.correctIndex) return 'correct';
    if (round.myChoice === index) return 'wrong';
    return 'disabled';
  }
  if (app.state.submitting && app.state.pendingChoice === index) return 'submitting';
  if (round.myChoice === index) return 'submitted';
  return 'default';
}

function game(app) {
  ui.begin(app);
  const ctx = ui.context();
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const compact = H < 700;
  const view = app.state.view;
  const round = view && view.round;
  if (!view || !round) {
    ui.header('对局', '加载中…');
    return;
  }

  ui.back(app, 'game.back');
  ui.text('第 ' + (round.index + 1) + ' / ' + round.total + ' 题', W / 2, ui.safeTop() + r(30), {
    size: 26,
    weight: '600',
    align: 'center',
  });
  ui.text('总分 ' + formatScore(scoreOf(view)), W - r(32), ui.safeTop() + r(30), {
    size: 24,
    color: C.text2,
    align: 'right',
  });

  const now = app.now();
  const duration = Math.max(1, round.endsAt - round.startedAt);
  const remaining = Math.max(0, round.endsAt - now);
  ui.progress(x, ui.safeTop() + r(82), W - r(64), r(6), remaining / duration, C.primary);

  const qy = ui.safeTop() + r(compact ? 88 : 108);
  const stemSize = compact ? 30 : 34;
  const stemLineH = compact ? 46 : 52;
  const stemLines = ui.wrap(round.stem, W - r(120), stemSize, '500', compact ? 3 : 4);
  const cardH = r(compact ? 62 : 78) + stemLines.length * r(stemLineH) + r(compact ? 24 : 28);
  ui.card(x, qy, W - r(64), cardH);
  ui.chip('单选题', x + r(28), qy + r(compact ? 16 : 24), { fill: C.primarySoft, color: C.primaryInk });
  ui.paragraph(round.stem, x + r(28), qy + r(compact ? 62 : 78), W - r(120), {
    size: stemSize,
    weight: '500',
    lineHeight: stemLineH,
    maxLines: compact ? 3 : 4,
  });

  const settled = round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
  let oy = qy + cardH + r(compact ? 20 : 28);
  const optionH = r(compact ? 94 : 112);
  const optionGap = r(compact ? 10 : 16);
  const opts = round.options || [];
  for (let i = 0; i < opts.length; i++) {
    const state = optionState(app, i);
    let fill = C.surface;
    let stroke = C.border;
    let badgeSoft = [C.aSoft, C.bSoft, C.cSoft, C.dSoft][i];
    let badgeInk = [C.aInk, C.bInk, C.cInk, C.dInk][i];
    if (state === 'submitted' || state === 'submitting') {
      fill = C.primarySoft;
      stroke = C.primary;
    } else if (state === 'correct') {
      fill = C.successSoft;
      stroke = C.success;
    } else if (state === 'wrong') {
      fill = C.dangerSoft;
      stroke = C.danger;
    } else if (state === 'disabled') {
      fill = '#FAF6F2';
    }

    ui.card(x, oy, W - r(64), optionH, { fill, stroke, shadow: false, radius: r(24) });
    ctxBadge(x + r(24), oy + r(compact ? 20 : 28), i, badgeSoft, badgeInk);
    const optSize = compact ? 28 : 31;
    const optLineH = compact ? 38 : 44;
    const optLines = ui.wrap(opts[i], W - r(170), optSize, '400', 2);
    const optStart = oy + (optionH - optLines.length * r(optLineH)) / 2;
    optLines.forEach((line, li) => {
      ui.text(line, x + r(90), optStart + li * r(optLineH), {
        size: optSize,
        weight: '400',
        color: C.text,
      });
    });
    if (state === 'correct') {
      ui.text('✓ 正确', x + W - r(64) - r(124), oy + r(40), { size: 22, color: C.successInk });
    } else if (state === 'wrong') {
      ui.text('✗ 你的选择', x + W - r(64) - r(144), oy + r(40), { size: 22, color: C.dangerInk });
    } else if (state === 'submitted') {
      ui.text('已提交', x + W - r(64) - r(100), oy + r(40), { size: 22, color: C.text2 });
    }
    if (app.phase() === 'answering' && !settled && typeof round.myChoice !== 'number') {
      ui.hit(app, 'game.answer', x, oy, W - r(64), optionH, i);
    }
    oy += optionH + optionGap;
  }

  const chips = app.chips();
  const cy = H - ui.safeBottom() - r(compact ? 84 : 96);
  const totalW = chips.length * r(56);
  let cx = W / 2 - totalW / 2 + r(28);
  chips.forEach((p) => {
    ui.avatar(p.avatar, cx - r(20), cy, r(40), {});
    if (settled) {
      ui.text(p.correct ? '✓' : '✗', cx + r(18), cy + r(22), {
        size: 18,
        color: p.correct ? C.successInk : C.dangerInk,
        align: 'center',
      });
    } else {
      ui.text(p.answered ? '✓' : '…', cx + r(18), cy + r(22), {
        size: 18,
        color: p.answered ? C.successInk : C.text2,
        align: 'center',
      });
    }
    cx += r(56);
  });
  let status = '点击选项作答';
  if (settled) status = '正确答案已揭晓';
  else if (round.answeredCount >= round.activeCount && round.activeCount > 0) status = '已全部作答，即将揭晓';
  else if (typeof round.myChoice === 'number') status = '已提交，等待其他人…';
  if (!settled && app.phase() === 'answering') {
    const remain = Math.max(0, Math.ceil((round.endsAt - Date.now()) / 1000));
    status = '剩余 ' + remain + 's · ' + status;
  }
  ui.text(status, W / 2, cy + r(52), { size: 22, color: C.text2, align: 'center' });

  if (app.phase() === 'countdown') {
    ctx.fillStyle = 'rgba(255, 248, 240, 0.9)';
    ctx.fillRect(0, 0, W, H);
    const count = Math.max(1, Math.ceil((round.startedAt - now) / 1000));
    ui.text(String(count), W / 2, H / 2 - r(110), { size: 140, weight: '700', color: C.primary, align: 'center' });
    ui.text('准备开始', W / 2, H / 2 + r(40), { size: 28, color: C.text2, align: 'center' });
  }
}

function ctxBadge(x, y, index, soft, ink) {
  const r = ui.rpx;
  ui.fillRound(x, y, r(56), r(56), r(28), soft);
  ui.text(['A', 'B', 'C', 'D'][index], x + r(28), y + r(28), { size: 28, weight: '700', color: ink, align: 'center', baseline: 'middle' });
}

function podium(app, rankings, y, compact) {
  const W = ui.width();
  const r = ui.rpx;
  const baseBottom = y + r(compact ? 230 : 300);
  const slots = [
    { p: rankings[1], x: W / 2 - r(315), size: r(compact ? 72 : 96), base: r(compact ? 52 : 72), badge: '#B8B8B8' },
    { p: rankings[0], x: W / 2 - r(101), size: r(compact ? 80 : 112), base: r(compact ? 64 : 96), badge: '#F5B301' },
    { p: rankings[2], x: W / 2 + r(113), size: r(compact ? 64 : 80), base: r(compact ? 40 : 56), badge: '#C58B5A' },
  ];

  slots.forEach((slot) => {
    if (!slot.p) return;
    const cx = slot.x + r(101);
    const baseTop = baseBottom - slot.base;
    ui.fillRound(slot.x, baseTop, r(202), slot.base, r(16), C.primarySoft);

    const avatarTop = baseTop - r(8) - slot.size;
    const avatarX = cx - slot.size / 2;
    ui.avatar(slot.p.avatar, avatarX, avatarTop, slot.size, { ring: slot.p.rank === 1 });

    if (slot.p.rank) {
      const bw = r(compact ? 30 : 36);
      const bx = avatarX + slot.size - bw + r(2);
      const by = avatarTop + r(2);
      ui.fillRound(bx, by, bw, bw, bw / 2, slot.badge);
      ui.text(String(slot.p.rank), bx + bw / 2, by + bw / 2, {
        size: compact ? 18 : 22,
        weight: '700',
        color: '#FFFFFF',
        align: 'center',
        baseline: 'middle',
      });
    }

    ui.text(slot.p.nickName, cx, baseTop + r(compact ? 6 : 8), {
      size: compact ? 20 : 24,
      weight: '600',
      align: 'center',
      maxWidth: r(190),
    });
    ui.text(formatScore(slot.p.score), cx, baseTop + r(compact ? 28 : 42), {
      size: compact ? 22 : 28,
      weight: '700',
      align: 'center',
    });
  });
}

function result(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const compact = H < 700;
  const view = app.state.view;
  const final = view && view.final;
  if (!final || !final.rankings) {
    ui.header('本局结束', '数据加载中…');
    return;
  }
  ui.back(app, 'result.home');
  ui.text('本局结束', W / 2, ui.safeTop() + r(34), { size: 30, weight: '600', align: 'center' });

  podium(app, final.rankings, ui.safeTop() + r(compact ? 60 : 92), compact);

  const me = final.rankings.find((p) => p.playerId === view.playerId) || {};
  const total = view.config.questionCount || 0;
  const rate = me.correctCount && total ? Math.round((me.correctCount / total) * 100) + '%' : '0%';
  const avg = me.correctCount ? formatDuration(me.correctTimeMs / me.correctCount) : '—';

  let y = ui.safeTop() + r(compact ? 340 : 440);
  ui.card(x, y, W - r(64), r(compact ? 80 : 96));
  const cellW = (W - r(64)) / 3;
  [rate, avg, formatScore(me.score)].forEach((v, i) => {
    ui.text(v, x + cellW * i + cellW / 2, y + r(compact ? 12 : 18), { size: compact ? 30 : 34, weight: '700', align: 'center' });
    ui.text(['正确率', '平均用时', '总分'][i], x + cellW * i + cellW / 2, y + r(compact ? 50 : 60), {
      size: compact ? 18 : 20,
      color: C.text2,
      align: 'center',
    });
  });

  y += r(compact ? 96 : 120);
  const rowH = compact ? r(56) : r(84);
  ui.card(x, y, W - r(64), r(compact ? 40 : 72) + final.rankings.length * rowH, { radius: r(28) });
  final.rankings.forEach((p, i) => {
    const ry = y + r(compact ? 6 : 16) + i * rowH;
    ui.text(String(p.rank), x + r(28), ry + r(compact ? 16 : 24), { size: compact ? 22 : 26, weight: '700', color: C.text2 });
    ui.avatar(p.avatar, x + r(64), ry + r(compact ? 6 : 12), r(compact ? 44 : 56), {});
    ui.text(p.nickName, x + r(132), ry + r(compact ? 12 : 18), { size: compact ? 22 : 26, weight: '600', maxWidth: r(220) });
    if (p.playerId === view.playerId) {
      ui.chip('我', x + r(132) + r(6), ry + r(compact ? 36 : 46), { fill: C.primarySoft, color: C.primaryInk, height: r(28), size: 16 });
    }
    ui.text(formatScore(p.score), x + W - r(64) - r(32), ry + r(compact ? 12 : 18), {
      size: compact ? 24 : 28,
      weight: '700',
      align: 'right',
    });
    ui.text(p.correctCount + '/' + total, x + W - r(64) - r(32), ry + r(compact ? 38 : 48), {
      size: compact ? 18 : 20,
      color: C.text2,
      align: 'right',
    });
  });

  const by = H - ui.safeBottom() - r(compact ? 130 : 150);
  ui.button(app, 'result.rematch', view.isOwner ? '再来一局' : '等房主再来一局', x, by, W - r(64), r(96), {
    size: 30,
    disabled: !view.isOwner || app.state.loading,
  });
  ui.text(view.isOwner ? '房主开启后，大家回到等待页' : '房主开启新一局后会自动回到房间', W / 2, by + r(104), {
    size: 20,
    color: C.text2,
    align: 'center',
  });
  ui.text('返回首页', W / 2 - r(90), by + r(138), { size: 24, color: C.primaryInk, align: 'center' });
  ui.text('晒战绩', W / 2 + r(90), by + r(138), { size: 24, color: C.primaryInk, align: 'center' });
  ui.hit(app, 'result.home', W / 2 - r(150), by + r(130), r(120), r(44));
  ui.hit(app, 'result.share', W / 2 + r(30), by + r(130), r(120), r(44));
}

function rank(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const compact = H < 700;
  const data = app.state.rank || {};
  let y = ui.safeTop() + r(36);
  ui.text('排行榜', x, y, { size: 44, weight: '600' });
  y += r(58);
  ui.text(data.weekText || '本周', x, y, { size: 24, color: C.text2 });
  ui.button(app, 'rank.refresh', '刷新', W - r(32) - r(96), y - r(8), r(96), r(48), {
    variant: 'ghost',
    size: 22,
  });

  y += r(56);
  const me = data.me;
  ui.card(x, y, W - r(64), r(112), { fill: C.primarySoft, shadow: false, radius: r(28) });
  ui.text('我的排名', x + r(24), y + r(20), { size: 22, color: C.text2 });
  ui.text(data.myRank ? '第 ' + data.myRank + ' 名' : '未上榜', x + r(24), y + r(50), {
    size: data.myRank ? 38 : 30,
    weight: data.myRank ? '700' : '500',
    color: data.myRank ? C.text : C.text2,
  });
  if (me) {
    ui.text(me.score + ' 分', W - r(56), y + r(28), { size: 28, weight: '700', align: 'right' });
    ui.text(me.games + ' 场 · ' + me.wins + ' 胜', W - r(56), y + r(66), {
      size: 20,
      color: C.text2,
      align: 'right',
    });
  } else {
    ui.text('本周还没成绩', W - r(56), y + r(34), { size: 22, color: C.text2, align: 'right' });
    ui.text('去开一局 →', W - r(56), y + r(66), { size: 22, color: C.primaryInk, align: 'right' });
    ui.hit(app, 'rank.create', W - r(180), y + r(20), r(150), r(70));
  }

  y += r(132);
  const top = data.top || [];
  if (!top.length) {
    ui.card(x, y, W - r(64), r(244), { fill: C.surface2, shadow: false, radius: r(28), stroke: C.border });
    ui.text('本周还没有人上榜', W / 2, y + r(70), { size: 30, weight: '600', align: 'center' });
    ui.text('来当第一个', W / 2, y + r(116), { size: 24, color: C.text2, align: 'center' });
    ui.button(app, 'rank.create', '创建房间', W / 2 - r(180), y + r(152), r(360), r(72), { variant: 'secondary', size: 26 });
  } else {
    const maxRows = compact ? 6 : 10;
    const rowH = compact ? r(66) : r(82);
    const shown = top.slice(0, maxRows);
    ui.card(x, y, W - r(64), r(24) + shown.length * rowH, { radius: r(28) });
    shown.forEach((p, i) => {
      const ry = y + r(16) + i * rowH;
      const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : String(p.rank);
      ui.text(medal, x + r(30), ry + r(26), { size: p.rank <= 3 ? 28 : 24, weight: '600', color: C.text2, align: 'center' });
      ui.avatar(p.avatar, x + r(66), ry + r(compact ? 6 : 10), r(compact ? 48 : 56), {});
      ui.text(p.nickName, x + r(136), ry + r(compact ? 10 : 14), { size: compact ? 24 : 26, weight: '600', maxWidth: r(230) });
      ui.text(p.score + ' 分', x + W - r(64) - r(28), ry + r(compact ? 14 : 18), { size: compact ? 24 : 26, weight: '700', align: 'right' });
      if (me && p.uid === me.uid) {
        ui.fillRound(x + r(4), ry, W - r(72), r(70), r(16), 'rgba(255,122,69,0.08)');
      }
    });
    if (top.length > maxRows) {
      ui.text('仅展示前 ' + maxRows + ' 名', W / 2, y + r(24) + shown.length * rowH + r(12), {
        size: 20,
        color: C.text2,
        align: 'center',
      });
    }
  }

  const fy = H - ui.safeBottom() - r(96) - r(72);
  ui.button(app, 'rank.rules', '榜单规则', W / 2 - r(120), fy, r(240), r(64), { variant: 'text', size: 24 });
  ui.footer(app, 'nav.rank');
}

function profile(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(32);
  const user = app.state.user || {};
  const stats = user.stats || {};
  let y = ui.safeTop() + r(40);
  ui.text('我的', x, y, { size: 44, weight: '600' });

  y += r(82);
  ui.card(x, y, W - r(64), r(168));
  ui.avatar(avatarOf(user), x + r(28), y + r(20), r(128), { ring: true });
  ui.text(user.nickName || '果友', x + r(180), y + r(34), { size: 34, weight: '600', maxWidth: r(300) });
  ui.text('累计 ' + (stats.games || 0) + ' 局 · ' + (stats.wins || 0) + ' 胜', x + r(180), y + r(86), {
    size: 22,
    color: C.text2,
  });
  ui.text('历史最佳 ' + (stats.bestScore || 0) + ' 分', x + r(180), y + r(116), { size: 22, color: C.text2 });
  ui.button(app, 'profile.nick', '编辑', W - r(32) - r(96), y + r(24), r(96), r(56), { variant: 'ghost', size: 22 });
  ui.button(app, 'profile.avatar', '换头像', W - r(32) - r(108), y + r(92), r(108), r(52), {
    variant: 'text',
    size: 22,
  });

  y += r(192);
  ui.card(x, y, W - r(64), r(104));
  const cw = (W - r(64)) / 3;
  const total = stats.totalAnswered || 0;
  const rate = total ? Math.round(((stats.totalCorrect || 0) / total) * 100) : 0;
  [stats.games || 0, stats.wins || 0, rate + '%'].forEach((v, i) => {
    ui.text(String(v), x + cw * i + cw / 2, y + r(18), { size: 34, weight: '700', align: 'center' });
    ui.text(['场次', '胜场', '正确率'][i], x + cw * i + cw / 2, y + r(62), {
      size: 20,
      color: C.text2,
      align: 'center',
    });
  });

  y += r(132);
  const rows = [
    { id: 'profile.rules', icon: 'book', label: '玩法说明' },
    { id: 'profile.privacy', icon: 'lock', label: '隐私与协议' },
  ];
  ui.card(x, y, W - r(64), rows.length * r(104));
  rows.forEach((row, i) => {
    const ry = y + i * r(104);
    ui.lineIcon(row.icon, x + r(28), ry + r(28), r(34), C.text2);
    ui.text(row.label, x + r(88), ry + r(34), { size: 28 });
    ui.text('›', W - r(64) - r(20), ry + r(26), { size: 34, color: C.text3, align: 'right' });
    ui.hit(app, row.id, x, ry, W - r(64), r(104));
    if (i < rows.length - 1) ui.fillRound(x + r(88), ry + r(104) - 1, W - r(160), 1, 0, C.divider);
  });

  ui.text('v0.1.0 · Guoguo Quiz', W / 2, y + rows.length * r(104) + r(32), {
    size: 20,
    color: C.text2,
    align: 'center',
  });
  ui.footer(app, 'nav.profile');
}

function rules(app) {
  ui.begin(app);
  const W = ui.width();
  const r = ui.rpx;
  const x = r(32);
  ui.back(app, 'rules.back');
  let y = ui.safeTop() + r(112);
  ui.text('玩法说明', x, y, { size: 44, weight: '600' });
  ui.text('四个人，一道题，看谁手快', x, y + r(54), { size: 26, color: C.text2 });

  y += r(112);
  const blocks = [
    ['1. 房主建局', '选择题数与每题时长，生成 6 位房间码，分享给朋友。'],
    ['2. 2–4 人入座', '朋友输入房间码加入；至少 2 人，房主才能开始。'],
    ['3. 限时抢答', '点选项即提交；倒计时结束或全员答完，立即揭晓。'],
    ['4. 计分', '答对 = 100 + 速度分 0–50；答错或未答 = 0。'],
    ['5. 排名', '总分 → 答对题数 → 正确题用时 → 加入时间。'],
    ['6. 周榜', '按自然周累计；至少 2 人正常结束的有效对局才计入。'],
  ];
  blocks.forEach((b) => {
    ui.text(b[0], x, y, { size: 28, weight: '600' });
    y += r(40);
    y = ui.paragraph(b[1], x, y, W - r(64), { size: 24, lineHeight: 38 });
    y += r(22);
  });
  ui.button(app, 'rules.create', '去开一局', x, y + r(8), W - r(64), r(88), { variant: 'secondary', size: 28 });
}

function privacy(app) {
  ui.begin(app);
  const W = ui.width();
  const r = ui.rpx;
  const x = r(32);
  ui.back(app, 'privacy.back');
  let y = ui.safeTop() + r(112);
  ui.text('隐私与协议', x, y, { size: 40, weight: '600' });
  y += r(58);

  const tabs = [
    { id: 'privacy', label: '隐私政策' },
    { id: 'terms', label: '用户协议' },
  ];
  const tw = (W - r(64) - r(8)) / 2;
  tabs.forEach((tab, i) => {
    const tx = x + i * (tw + r(8));
    const active = app.state.privacyTab === tab.id;
    ui.fillRound(tx, y, tw, r(64), r(32), active ? C.surface : '#F6ECE3');
    ui.text(tab.label, tx + tw / 2, y + r(32), {
      size: 24,
      weight: '600',
      color: active ? C.text : C.text2,
      align: 'center',
      baseline: 'middle',
    });
    ui.hit(app, 'privacy.tab', tx, y, tw, r(64), tab.id);
  });

  y += r(88);
  const isPrivacy = app.state.privacyTab !== 'terms';
  const blocks = isPrivacy
    ? [
        ['我们收集什么', '微信 openid、你填写的昵称头像、房间与对局记录（分数、答题结果、时间）。不收集手机号、通讯录、位置和微信好友关系。'],
        ['怎么使用', '昵称头像用于座位、结算和排行榜；openid 用于登录识别与防重复计分；对局记录用于结算、周榜和异常排查。'],
        ['保存与删除', '对局记录默认保留 180 天，周榜保留 8 周，日志保留 30 天。可在「我的」清除本地记录。'],
        ['分享与第三方', '分享卡片只包含房间码和邀请文案，不包含 openid 或分数明细；不会出售或共享个人信息。'],
        ['未成年人', '不含支付、广告或抽奖；未成年人应在监护人指导下使用。'],
      ]
    : [
        ['服务说明', '果果答题提供熟人房间答题服务。房间由房主创建，玩家通过房间码或分享卡片加入；不提供随机匹配。'],
        ['使用规范', '请勿使用侮辱性昵称头像，请勿使用外挂、脚本或篡改请求影响公平性。'],
        ['成绩与榜单', '成绩以服务端结算为准；异常或无效对局不计入周榜；排行榜为站内榜。'],
        ['免责', '因网络、设备、微信平台或不可抗力导致的中断，我们会尽力恢复，但不承诺对局一定完成。'],
        ['变更', '我们可能根据功能或法规变化更新协议，更新后会在游戏内展示。'],
      ];

  blocks.forEach((b) => {
    ui.text(b[0], x, y, { size: 26, weight: '600' });
    y += r(38);
    y = ui.paragraph(b[1], x, y, W - r(64), { size: 22, lineHeight: 36 });
    y += r(18);
  });
  ui.text('更新日期：2026-10-22', W / 2, y + r(10), { size: 20, color: C.text3, align: 'center' });
}

function loading(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  ui.text('🍎', W / 2, H / 2 - r(220), { size: 100, align: 'center' });
  ui.text('果果答题', W / 2, H / 2 - r(90), { size: 48, weight: '700', align: 'center' });
  ui.text('Guoguo Quiz', W / 2, H / 2 - r(30), { size: 24, color: C.text2, align: 'center' });
  if (app.state.error) {
    ui.text(app.state.error, W / 2, H / 2 + r(50), { size: 24, color: C.dangerInk, align: 'center' });
    ui.button(app, 'common.retry', '重试', W / 2 - r(180), H / 2 + r(100), r(360), r(88), { variant: 'secondary', size: 28 });
  } else {
    ui.text('正在准备房间…', W / 2, H / 2 + r(50), { size: 24, color: C.text2, align: 'center' });
  }
}

module.exports = {
  home,
  create,
  join,
  room,
  game,
  result,
  rank,
  profile,
  rules,
  privacy,
  loading,
  optionState,
};
