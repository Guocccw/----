const ui = require('./ui');
const { COLORS, formatScore, formatDuration, avatarOf } = require('./core');

const C = COLORS;

/* ------------------------------------------------------------------ *
 * 果汁街机 · 页面
 * 纯 Canvas 绘制：奶油纸底 + 粗描边贴纸 + 实心投影 + 手账胶带。
 * ------------------------------------------------------------------ */

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

function pillButton(app, id, label, x, y, w, h, opts) {
  return ui.button(app, id, label, x, y, w, h, Object.assign({ radius: h / 2, size: 22, weight: '800' }, opts || {}));
}

/* 页面标题：返回键 + 居中标语 */
function pageHeader(app, backId, title, subtitle, opts) {
  const r = ui.rpx;
  const W = ui.width();
  const o = opts || {};
  if (backId) ui.back(app, backId);
  const y = ui.safeTop() + r(6);
  ui.display(title, W / 2, y + r(8), {
    size: o.size || 48,
    align: 'center',
    color: C.card,
    outlineWidth: r(8),
  });
  let ny = y + r(80);
  if (subtitle) {
    ui.text(subtitle, W / 2, ny, { size: 22, color: C.ink2, align: 'center', weight: '500' });
    ny += r(36);
  }
  return ny + r(18);
}

/* ------------------------------- 首页 ------------------------------- */

function home(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cx = W / 2;
  const cw = W - r(80);
  const compact = H < 700;
  const tiny = H < 640;
  const user = app.state.user || {};
  const stats = user.stats || {};

  // 顶栏：头像 + 昵称 + 玩法
  let y = ui.safeTop() + r(6);
  const av = r(78);
  ui.avatar(user.avatar, x, y, av, {});
  ui.text(user.nickName || '果友', x + av + r(18), y + r(4), { size: 30, weight: '800', maxWidth: r(300) });
  ui.text('累计 ' + (stats.games || 0) + ' 局 · 最佳 ' + (stats.bestScore || 0) + ' 分',
    x + av + r(18), y + r(44), { size: 21, color: C.ink2, weight: '500' });
  const ruleW = r(108);
  pillButton(app, 'home.rules', '玩法', W - x - ruleW, y + r(8), ruleW, r(58), {
    variant: 'secondary',
    icon: 'book',
    iconSize: r(28),
  });

  // 招牌
  y += av + r(tiny ? 24 : 28);
  const heroH = r(tiny ? 216 : compact ? 306 : 346);
  const tilt = -1.4;
  ctxGroup(W / 2, y + heroH / 2, tilt, () => {
    const l = -cw / 2;
    const t = -heroH / 2;
    ui.fillRound(l, t + r(11), cw, heroH, r(46), C.ink);
    ui.fillRound(l, t, cw, heroH, r(46), C.orangeSoft);
    ctxSaveClip(l, t, cw, heroH, r(46), () => {
      const ctx = ui.context();
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      for (let i = -2; i < 10; i++) {
        ctx.save();
        ctx.translate(l + r(60) + i * r(90), 0);
        ctx.rotate((28 * Math.PI) / 180);
        ctx.fillRect(0, t - r(40), r(26), heroH + r(80));
        ctx.restore();
      }
    });
    ui.strokeRound(l, t, cw, heroH, r(46), C.ink, r(5));
    const titleSize = compact ? 66 : 78;
    ui.display('果果答题', l + r(40), t + r(44), {
      size: titleSize,
      color: C.card,
      outlineWidth: r(10),
    });
    ui.text('GUOGUO QUIZ', l + r(46), t + r(44) + r(titleSize) + r(16), {
      size: 18,
      weight: '800',
      color: ui.alpha(C.orangeDeep, 0.72),
    });
    ui.badge('熟人局 · 2–4 人', l + r(38), heroH / 2 - r(66), {
      fill: C.card,
      size: 20,
      height: r(44),
      rotate: -2,
      shadow: true,
    });
    ui.mascot(cw / 2 - r(116), heroH / 2 - r(54), r(tiny ? 112 : compact ? 128 : 148), { mood: 'happy' });
    ui.tape(l + r(54), t + r(6), r(92), r(30), -8);
  });

  ui.text('🍋', W - r(112), y - r(18), { size: r(tiny ? 46 : 58), rotate: 12 });

  const tagline = '四个人，一道题，看谁手快';
  const taglineH = r(34);
  const createH = r(tiny ? 96 : compact ? 104 : 116);
  const joinH = r(tiny ? 84 : compact ? 92 : 100);
  const stepH = r(compact ? 76 : 88);
  const statsH = r(tiny ? 84 : compact ? 96 : 108);
  const promoH = r(compact ? 128 : 146);
  const showSteps = !tiny;
  const footerTop = H - ui.safeBottom() - r(132);

  // 按剩余空间分配间距：既不会挤在上半屏，也不会留一大块空白
  const bottomLimit = footerTop - r(48);
  let fixed = heroH + taglineH + createH + joinH + statsH;
  if (showSteps) fixed += stepH;
  let items = showSteps ? 6 : 4;
  let promo = true;
  if (tiny || bottomLimit - (y + fixed) < r(120)) promo = false;
  if (promo) { fixed += promoH; items += 1; }
  const gapMin = r(14);
  const gapMax = r(44);
  let gap = items > 1 ? (bottomLimit - y - fixed) / (items - 1) : gapMin;
  gap = Math.max(gapMin, Math.min(gapMax, gap));
  let cursor = y + heroH + gap;
  y = cursor;

  ui.text(tagline, x + r(6), y + r(6), {
    size: compact ? 26 : 28,
    weight: '700',
    color: C.ink2,
  });
  ui.sparkle(x + cw - r(10), y + r(14), r(11), C.butter);

  cursor = y + taglineH + gap;
  ui.button(app, 'home.create', '创建房间', x, cursor, cw, createH, {
    size: 34,
    icon: 'bolt',
    iconSize: r(42),
  });

  cursor += createH + gap;
  ui.button(app, 'home.join', '输入房间码加入', x, cursor, cw, joinH, {
    variant: 'secondary',
    size: 28,
    icon: 'users',
    iconSize: r(32),
  });

  cursor += joinH + gap;
  if (showSteps) {
    ui.panel(x, cursor, cw, stepH, {
      fill: C.cream,
      radius: r(26),
      shadow: 'soft',
      lineWidth: r(3),
      stroke: ui.alpha(C.ink, 0.18),
    });
    const steps = [['1', '建一桌'], ['2', '发房间码'], ['3', '抢答计分']];
    const colW = cw / 3;
    steps.forEach((st, i) => {
      const numD = r(40);
      const bx = x + colW * i + r(18);
      const by = cursor + (stepH - numD) / 2;
      ui.fillRound(bx, by, numD, numD, r(14), [C.orange, C.lime, C.grape][i]);
      ui.strokeRound(bx, by, numD, numD, r(14), C.ink, r(2));
      ui.text(st[0], bx + numD / 2, by + numD / 2, {
        size: 20,
        weight: '800',
        align: 'center',
        baseline: 'middle',
      });
      ui.text(st[1], bx + numD + r(12), cursor + stepH / 2, {
        size: 22,
        weight: '800',
        baseline: 'middle',
      });
      if (i < 2) {
        ui.text('›', x + colW * (i + 1) - r(4), cursor + stepH / 2, {
          size: 26,
          color: ui.alpha(C.ink, 0.28),
          align: 'center',
          baseline: 'middle',
        });
      }
    });
    cursor += stepH + gap;
  }

  // 数据小方块
  const tiles = [
    { v: stats.games || 0, u: '局', label: '累计对局', color: C.orange },
    { v: stats.wins || 0, u: '胜', label: '拿下胜利', color: C.lime },
    { v: stats.bestScore || 0, u: '分', label: '历史最佳', color: C.grape },
  ];
  const tGap = r(12);
  const tw = (cw - tGap * 2) / 3;
  tiles.forEach((t, i) => {
    const tx = x + i * (tw + tGap);
    ui.panel(tx, cursor, tw, statsH, { fill: C.card, radius: r(24), shadow: 'soft' });
    ui.fillRound(tx + tw / 2 - r(18), cursor + r(12), r(36), r(6), r(3), t.color);
    const numSize = tiny ? 32 : 38;
    const numW = ui.measure(String(t.v), numSize, '800');
    const unitW = ui.measure(t.u, 20, '700');
    const groupW = numW + r(3) + unitW;
    ui.text(String(t.v), tx + tw / 2 - groupW / 2, cursor + r(24), {
      size: numSize,
      weight: '800',
    });
    ui.text(t.u, tx + tw / 2 - groupW / 2 + numW + r(3), cursor + r(24) + r(numSize) - r(20), {
      size: 20,
      weight: '700',
      color: C.ink2,
    });
    ui.text(t.label, tx + tw / 2, cursor + statsH - r(28), { size: 18, color: C.ink2, align: 'center' });
  });
  cursor += statsH;

  // 本周榜入口
  if (promo && cursor + gap + promoH <= footerTop - r(2)) {
    const py = cursor + gap;
    ui.panel(x, py, cw, promoH, { fill: C.card, radius: r(30) });
    ui.text('本周榜', x + r(28), py + r(22), { size: 28, weight: '800' });
    ui.text('看看谁的手速最快', x + r(28), py + r(66), { size: 20, color: C.ink2 });
    const px = x + cw - r(150);
    const base = py + promoH - r(22);
    const bars = [
      [px + r(8), r(40), C.cream],
      [px + r(46), r(62), C.butter],
      [px + r(84), r(30), C.grapeSoft],
    ];
    bars.forEach((b) => {
      ui.fillRound(b[0], base - b[1], r(30), b[1], r(8), b[2]);
      ui.strokeRound(b[0], base - b[1], r(30), b[1], r(8), C.ink, r(2));
    });
    ui.icon('crown', px + r(61), base - r(62) - r(14), r(26), { color: C.orangeDeep });
    ui.icon('chevron-right', x + cw - r(26), py + promoH / 2, r(26), { color: C.ink3 });
    ui.hit(app, 'nav.rank', x, py, cw, promoH);
  }

  ui.footer(app, 'nav.home');
}

function ctxGroup(cx, cy, angle, fn) {
  const ctx = ui.context();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  fn();
  ctx.restore();
}

function ctxSaveClip(x, y, w, h, radius, fn) {
  const ctx = ui.context();
  ctx.save();
  ui.roundRect(x, y, w, h, radius);
  ctx.clip();
  fn();
  ctx.restore();
}

/* ------------------------------- 创建 ------------------------------- */

function create(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;

  let y = pageHeader(app, 'create.back', '开一局', '选好节奏，朋友马上到');

  const gap = r(12);
  const cw3 = (cw - gap * 2) / 3;
  const tiny = H < 640;
  const cardH = r(tiny ? 140 : compact ? 156 : 190);
  const sectionGap = r(tiny ? 26 : compact ? 34 : 46);

  const section = (label, color, list, key, state) => {
    ui.ribbon(label, x, y, { fill: color, size: 22, height: r(46) });
    y += r(62);
    list.forEach((value, i) => {
      const selected = state === value;
      const sx = x + i * (cw3 + gap);
      const sy = y + (selected ? -r(2) : 0);
      ui.panel(sx, sy, cw3, cardH, {
        fill: selected ? C.orangeSoft : C.card,
        radius: r(28),
        shadow: selected ? 'hard' : 'soft',
        stroke: selected ? C.ink : ui.alpha(C.ink, 0.16),
        lineWidth: selected ? r(5) : r(3),
      });
      const main = key === 'count' ? String(value) : value + 's';
      const suffix = key === 'count' ? '题' : '';
      const mainSize = compact ? 44 : 50;
      const tw = ui.measure(main, mainSize, '800');
      const sw = suffix ? ui.measure(suffix, 18, '700') : 0;
      ui.text(main, sx + cw3 / 2 - (sw + r(3)) / 2, sy + r(compact ? 28 : 38), {
        size: mainSize,
        weight: '800',
        align: 'center',
      });
      if (suffix) {
        ui.text(suffix, sx + cw3 / 2 + tw / 2 - r(2), sy + r(compact ? 54 : 66), {
          size: 18,
          weight: '700',
          color: C.ink2,
        });
      }
      const desc = key === 'count'
        ? (value === 10 ? '约 3 分钟' : value === 15 ? '约 5 分钟' : '硬核长局')
        : (value === 10 ? '紧张' : value === 15 ? '适中' : '从容');
      ui.text(desc, sx + cw3 / 2, sy + cardH - r(38), { size: 18, color: C.ink2, align: 'center' });
      if (selected) {
        ui.badge('✓', sx + cw3 - r(42), sy + r(10), {
          fill: C.lime,
          size: 18,
          height: r(34),
          padX: r(8),
          rotate: 8,
        });
      }
      ui.hit(app, key === 'count' ? 'create.count' : 'create.duration', sx, sy, cw3, cardH, value);
    });
    y += cardH + sectionGap;
  };

  section('题目数量', C.butter, [10, 15, 20], 'count', app.state.create.count);
  section('每题时长', C.sky, [10, 15, 20], 'duration', app.state.create.duration);

  // 时间小票
  const total = app.state.create.count * (app.state.create.duration + 4);
  const minutes = Math.max(1, Math.round(total / 60));
  const ticketH = r(compact ? 84 : 110);
  ui.ticket(x, y, cw, ticketH, { fill: C.card, notchFill: C.paper, shadow: 'soft', radius: r(26) });
  ui.icon('clock', x + r(48), y + ticketH / 2, r(34), { color: C.ink2 });
  ui.text('预计 ' + minutes + ' 分钟', x + r(78), y + ticketH / 2, {
    size: 24,
    weight: '800',
    baseline: 'middle',
  });
  const maxW = ui.measure('最多 4 人', 20, '600');
  ui.text('最多 4 人', x + cw - r(42) - maxW, y + ticketH / 2, {
    size: 20,
    color: C.ink2,
    weight: '600',
    baseline: 'middle',
  });
  y += ticketH + r(compact ? 18 : 26);

  // 计分方式
  const scoreH = r(compact ? 84 : 104);
  if (!tiny && y + scoreH < H - ui.safeBottom() - r(compact ? 190 : 220)) {
    ui.panel(x, y, cw, scoreH, {
      fill: C.butterSoft,
      radius: r(26),
      shadow: 'soft',
      lineWidth: r(3),
    });
    ui.fillRound(x + r(16), y + r(16), r(48), r(48), r(16), C.butter);
    ui.strokeRound(x + r(16), y + r(16), r(48), r(48), r(16), C.ink, r(2));
    ui.icon('coin', x + r(40), y + r(40), r(26), { color: C.ink });
    ui.text('答对 100 分 + 最多 50 速度分', x + r(78), y + r(compact ? 18 : 24), {
      size: 20,
      weight: '800',
    });
    ui.text('答得越快，加分越多；答错不扣分', x + r(78), y + r(compact ? 48 : 58), {
      size: 18,
      color: C.ink2,
      maxWidth: cw - r(96),
    });
    y += scoreH + r(20);
  }

  // 小提示
  const tipH = r(compact ? 84 : 96);
  if (!tiny && y + tipH < H - ui.safeBottom() - r(compact ? 180 : 210)) {
    ui.panel(x, y, cw, tipH, {
      fill: C.grapeSoft,
      radius: r(28),
      shadow: 'soft',
      lineWidth: r(3),
      stroke: ui.alpha(C.ink, 0.2),
    });
    ui.mascot(x + r(52), y + tipH / 2, r(compact ? 56 : 64), { mood: 'happy' });
    ui.text('开局自动倒数 3 秒', x + r(100), y + r(compact ? 20 : 24), {
      size: 21,
      weight: '800',
    });
    ui.text('准备好就能开抢', x + r(100), y + r(compact ? 50 : 56), {
      size: 18,
      color: C.ink2,
    });
  }

  const by = H - ui.safeBottom() - r(compact ? 150 : 168);
  ui.button(app, 'create.submit', '建房并邀请', x, by, cw, r(compact ? 96 : 108), {
    size: 32,
    icon: 'bolt',
    iconSize: r(40),
    disabled: app.state.loading,
  });
  ui.text('建好后把 6 位房间码发给朋友', W / 2, by + r(compact ? 112 : 126), {
    size: 20,
    color: C.ink2,
    align: 'center',
  });
}

/* ------------------------------- 加入 ------------------------------- */

function join(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;

  let y = pageHeader(app, 'join.back', '进房间', '让朋友把 6 位房间码发给你');

  const gap = r(compact ? 8 : 10);
  const bw = (cw - gap * 5) / 6;
  const bh = r(compact ? 108 : 132);
  const code = app.state.joinCode || '';
  for (let i = 0; i < 6; i++) {
    const bx = x + i * (bw + gap);
    const filled = !!code[i];
    ui.panel(bx, y, bw, bh, {
      fill: filled ? C.orangeSoft : C.card,
      radius: r(22),
      shadow: filled ? 'hard' : 'soft',
      stroke: filled ? C.ink : ui.alpha(C.ink, 0.16),
      lineWidth: filled ? r(4) : r(3),
    });
    if (filled) {
      ui.display(code[i], bx + bw / 2, y + bh / 2 - r(2), {
        size: compact ? 42 : 48,
        align: 'center',
        baseline: 'middle',
        color: C.card,
        outlineWidth: r(7),
      });
    } else {
      ui.fillRound(bx + bw / 2 - r(12), y + bh / 2 - r(2), r(24), r(4), r(2), ui.alpha(C.ink, 0.18));
    }
  }

  const hintY = y + bh + r(18);
  if (app.state.joinError) {
    ui.text('！' + app.state.joinError, x, hintY, { size: 21, color: C.dangerInk, weight: '700' });
  } else {
    ui.text('房间码在分享卡片里，也可以手动输入', x, hintY, { size: 20, color: C.ink2 });
  }

  // 键位固定在底部，拇指够得到
  const keyGap = r(compact ? 8 : 10);
  const kw = (cw - keyGap * 2) / 3;
  const kh = r(compact ? 100 : 116);
  const keypadH = 4 * kh + 3 * keyGap;
  const keypadY = H - ui.safeBottom() - r(compact ? 14 : 26) - keypadH;

  // 中间留白交给果果
  const freeTop = hintY + r(34);
  if (keypadY - freeTop > r(140)) {
    const cy = freeTop + (keypadY - freeTop) / 2;
    ui.mascot(W / 2, cy - r(34), r(compact ? 112 : 132), { mood: 'happy' });
    ui.text('输进来，就能和朋友同屏抢答', W / 2, cy + r(44), {
      size: 20,
      color: C.ink2,
      align: 'center',
    });
    ui.sparkle(W / 2 + r(78), cy - r(54), r(10), ui.alpha(C.butter, 0.9));
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'submit'];
  keys.forEach((key, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const kx = x + col * (kw + keyGap);
    const ky = keypadY + row * (kh + keyGap);
    if (key === 'submit') {
      ui.button(app, 'join.submit', '加入', kx, ky, kw, kh, {
        variant: 'lime',
        size: 30,
        disabled: code.length !== 6 || app.state.loading,
        radius: r(24),
      });
    } else if (key === 'del') {
      ui.button(app, 'join.del', '删除', kx, ky, kw, kh, {
        variant: 'secondary',
        size: 22,
        icon: 'trash',
        iconSize: r(26),
        radius: r(24),
      });
    } else {
      ui.button(app, 'join.key', key, kx, ky, kw, kh, {
        variant: 'ghost',
        size: 32,
        radius: r(24),
        payload: key,
      });
    }
  });
}

/* ------------------------------- 等待 ------------------------------- */

function room(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const view = app.state.view;
  const compact = H < 700;

  if (!view) {
    pageHeader(app, 'room.back', '房间', '加载中…');
    return;
  }

  let y = pageHeader(app, 'room.back', '等待开桌', '人齐了就开抢');

  // 房卡
  const cardH = r(compact ? 148 : 170);
  ui.ticket(x, y, cw, cardH, { fill: C.butterSoft, shadow: 'hard', radius: r(32) });
  ui.text('房间码', x + r(34), y + r(22), { size: 20, color: C.ink2, weight: '600' });
  const code = String(view.roomCode || '');
  ui.text(code.split('').join(' '), x + r(34), y + r(52), { size: compact ? 46 : 54, weight: '800' });
  const btnX = x + cw - r(154);
  ui.button(app, 'room.copy', '复制', btnX, y + r(24), r(120), r(52), {
    variant: 'secondary',
    size: 20,
    radius: r(20),
  });
  ui.button(app, 'room.share', '分享', btnX, y + r(86), r(120), r(52), {
    variant: 'primary',
    size: 20,
    radius: r(20),
  });
  ui.tape(x + cw - r(92), y + r(8), r(72), r(24), 10);

  y += cardH + r(compact ? 24 : 30);

  // 入座进度
  const active = (view.players || []).filter((p) => !p.left).length;
  ui.text('已入座', x, y, { size: 24, weight: '800' });
  ui.text(active + ' / 4', x + r(86), y, { size: 24, weight: '800', color: C.orangeDeep });
  const dotX = x + r(170);
  for (let i = 0; i < 4; i++) {
    const filled = i < active;
    ctxDot(dotX + i * r(32), y + r(14), r(10), filled ? C.orange : ui.alpha(C.ink, 0.12), filled);
  }
  ui.text(view.config.questionCount + ' 题 · ' + view.config.durationSec + ' 秒/题', x + cw, y, {
    size: 20,
    color: C.ink2,
    align: 'right',
  });

  y += r(compact ? 42 : 50);

  // 座位
  const gap = r(14);
  const sw = (cw - gap) / 2;
  const sh = r(H < 640 ? 170 : compact ? 200 : 240);
  const players = (view.players || []).slice().sort((a, b) => a.seat - b.seat);
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = x + col * (sw + gap);
    const sy = y + row * (sh + gap);
    const p = players[i];
    if (p) {
      const isMe = p.playerId === view.playerId;
      const online = app.now() - (p.lastSeenAt || 0) < 45000 && !p.left;
      ui.panel(sx, sy, sw, sh, {
        fill: C.card,
        radius: r(28),
        shadow: 'soft',
        stroke: isMe ? C.orange : ui.alpha(C.ink, 0.16),
        lineWidth: isMe ? r(5) : r(3),
      });
      ui.avatar(p.avatar, sx + sw / 2 - r(44), sy + r(18), r(88), { ring: isMe });
      if (p.isOwner) {
        ui.badge('房主', sx + sw - r(66), sy + r(10), {
          fill: C.butter,
          size: 16,
          height: r(32),
          padX: r(10),
          rotate: 6,
        });
      }
      if (isMe) {
        ui.badge('我', sx + r(10), sy + r(10), {
          fill: C.orange,
          size: 16,
          height: r(32),
          padX: r(10),
          rotate: -6,
        });
      }
      ui.text(p.nickName, sx + sw / 2, sy + r(124), {
        size: 24,
        weight: '800',
        align: 'center',
        maxWidth: sw - r(24),
      });
      const statusText = p.left ? '已离开' : online ? '已入座' : '离线';
      const dotColor = p.left ? C.ink3 : online ? C.success : C.warning;
      ctxDot(sx + sw / 2 - r(30), sy + sh - r(28), r(5), dotColor, true);
      ui.text(statusText, sx + sw / 2 - r(18), sy + sh - r(36), { size: 18, color: C.ink2 });
    } else {
      ui.panel(sx, sy, sw, sh, {
        fill: '#FFF9EE',
        radius: r(28),
        shadow: false,
        stroke: ui.alpha(C.ink, 0.22),
        lineWidth: r(3),
      });
      ui.icon('plus', sx + sw / 2, sy + sh / 2 - r(16), r(44), { color: ui.alpha(C.ink, 0.35) });
      ui.text('叫个朋友', sx + sw / 2, sy + sh / 2 + r(24), {
        size: 20,
        color: C.ink2,
        align: 'center',
      });
      ui.hit(app, 'room.share', sx, sy, sw, sh);
    }
  }

  y += sh * 2 + gap;

  // 底部操作从安全区往上排
  const bottomY = H - ui.safeBottom();
  const leaveY = bottomY - r(compact ? 26 : 30);
  const hintY = leaveY - r(compact ? 32 : 36);
  const startH = r(compact ? 94 : 104);
  const startY = hintY - r(compact ? 16 : 20) - startH;
  const inviteH = r(compact ? 80 : 88);
  const inviteY = startY - r(compact ? 14 : 16) - inviteH;

  const owner = !!view.isOwner;

  // 小提示（塞得下才画）
  const noteH = r(compact ? 64 : 76);
  const noteY = y + r(12);
  if (noteY + noteH < (owner ? inviteY : startY) - r(12)) {
    ui.panel(x, noteY, cw, noteH, {
      fill: C.card,
      radius: r(24),
      shadow: 'soft',
      lineWidth: r(3),
      stroke: ui.alpha(C.ink, 0.16),
    });
    ui.icon('sparkle', x + r(34), noteY + noteH / 2, r(28), { color: C.orangeDeep });
    ui.text('房主点开始后，会自动倒数 3 秒', x + r(58), noteY + noteH / 2, {
      size: 19,
      color: C.ink2,
      weight: '600',
      baseline: 'middle',
      maxWidth: cw - r(80),
    });
  }

  if (owner) {
    const canStart = active >= 2;
    ui.button(app, 'room.share', '邀请好友', x, inviteY, cw, inviteH, {
      variant: 'secondary',
      size: 26,
      icon: 'share',
      iconSize: r(32),
    });
    ui.button(app, 'room.start', canStart ? '开始游戏' : '还差 ' + (2 - active) + ' 位朋友', x, startY, cw, startH, {
      variant: 'lime',
      size: 32,
      icon: canStart ? 'play' : 'users',
      iconSize: r(38),
      disabled: !canStart || app.state.loading,
    });
  } else {
    ui.button(app, 'room.share', '邀请好友', x, startY, cw, startH, {
      variant: 'secondary',
      size: 30,
      icon: 'share',
      iconSize: r(36),
    });
  }

  let hint = owner
    ? (active >= 2 ? '人齐了，开抢！' : '再喊 1 位就能开始')
    : '等待房主开始…';
  ui.text(hint, W / 2, hintY, {
    size: 20,
    color: C.ink2,
    align: 'center',
  });

  ui.text('离开房间', W / 2, leaveY, {
    size: 22,
    color: C.dangerInk,
    align: 'center',
    weight: '700',
  });
  ui.hit(app, 'room.leave', W / 2 - r(80), leaveY - r(12), r(160), r(44));
}

function ctxDot(cx, cy, radius, color, filled) {
  const ctx = ui.context();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/* ------------------------------- 对局 ------------------------------- */

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

/* --------------------------- 揭晓：本轮冠军 --------------------------- */

/* 冠军语录：同一题所有客户端算出来的文案一致（按冠军 + 轮次轮换） */
const CHAMPION_TAUNTS = [
  '轻松拿捏',
  '在座的各位都是乐色',
  '手速这块，我拿捏得死死的',
  '这题我闭着眼都能答',
  '就这？再来十题',
  '谢谢各位的陪跑',
  '别急，慢慢想，反正也追不上',
  '我还没发力，你们就倒下了',
  '不好意思，先走一步',
  '无敌是多么，多么寂寞',
  '这波啊，这波是降维打击',
  '还有谁？',
  '你们慢慢答，我先睡了',
  '知识就是力量，而我是满级号',
  '答题如喝水，基本操作勿6',
  '抱歉，我的大脑刚刚自动答题了',
  '这难度是不是设置错了？建议调高',
  '我还没热身的，你们就没了？',
  '感谢对手帮我刷记录',
  '用脚答都能赢，但我还是用手了',
  '你们是在答题还是在猜谜？',
  '这题出得不错，下次别出了',
  '我蒙的都比你蒙的准',
  '答题嘛，讲究一个天赋',
  '你们这是来比赛还是来观战的？',
  '别练了，练也练不过我',
  '我给你们一个忠告：换个游戏吧',
  '再给我一次机会，我还能更快',
  '差点以为你们能赢，对不起我装不下去了',
  '我还没用全力呢，真的',
  '你们是不是把答案写错题号了？',
  '开局就结束的比赛，有点无聊',
  '这局最大的悬念是我能快多少',
  '下次可以认真点吗？我都没尽兴',
  '你们的状态不佳啊，是不是没睡醒',
  '建议赛前喝杯咖啡提提神',
  '我让让你们，毕竟友谊第一',
  '啊？已经赢了？我还没进入状态',
  '答题界的小学生既视感',
  '我上辈子可能是百科全书',
  '别灰心，下次……算了没有下次了',
  '你们犹豫的那0.5秒我就选完了',
  '这题太难了，难到我秒答都没成就感',
  '我严重怀疑你们在看我的答案',
  '求求了，给点压力吧',
  '我还没哭呢，你们先输了',
  '欢迎来到我的个人秀',
  '各位虽败犹荣，反正荣的不是我',
  '今天的热身运动到此结束',
  '承让承让，下次让你们先看题',
];

function hashText(text) {
  let h = 7;
  const s = String(text == null ? '' : text);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}

function tauntFor(roundIndex, playerId) {
  const i = hashText(playerId) + Number(roundIndex || 0);
  return CHAMPION_TAUNTS[Math.abs(i) % CHAMPION_TAUNTS.length];
}

/* 本轮冠军 = 答对且手速最快（加分最多）的人；没人答对就没有冠军卡 */
function roundChampion(app) {
  const chips = app.chips ? app.chips() : [];
  let best = null;
  for (let i = 0; i < chips.length; i++) {
    const c = chips[i];
    if (c.correct !== true) continue;
    if (!best || (c.gain || 0) > (best.gain || 0)) best = c;
  }
  return best;
}

/**
 * 揭晓冠军贴纸：盖在题卡上，0.3 秒 easeOutBack 弹入（0.58 → 1，带一点过冲）。
 * 位置/尺寸与题卡一致，动画结束后正好把题干盖住，不挡选项和计分板。
 * 一直显示到本题结束（下一题/结算）再由下一屏整块换掉；不做半透明淡出，避免和题干叠成一层灰。
 * 返回 true 表示这轮有冠军、已经把题卡盖掉了。
 */
function drawChampionCard(app, round, champion, x, y, w, h, compact) {
  const r = ui.rpx;
  const ctx = ui.context();
  const now = Date.now();
  const at = Number(app.state.revealAt) || 0;
  const t = at ? ui.clamp((now - at) / 300, 0, 1) : 1;
  const e = at ? ui.easeOutBack(t) : 1;

  const scale = 0.58 + 0.42 * e;
  const rise = (1 - e) * r(26);
  const rot = -4 * (1 - t); // 甩进来的一点点歪，落定后归零

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 + rise);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);

  // 贴纸底
  ui.panel(0, 0, w, h, {
    fill: C.cream,
    radius: r(34),
    shadow: 'hard',
    lineWidth: r(4),
  });

  // 头像 + 皇冠（题干只有一行时卡片矮，内容跟着收一点）
  const tight = h < r(180);
  const pad = r(22);
  const d = Math.min(r(compact ? 96 : 112), h - r(36));
  const avX = pad;
  const avY = (h - d) / 2;
  ui.avatar(champion.avatar, avX, avY, d, {
    ring: true,
    ringColor: C.orange,
    lineWidth: 3,
  });
  ui.icon('crown', avX + d / 2, avY - r(12), r(compact ? 30 : 34), { color: C.orangeDeep });

  // 名字 + 本轮加分
  const colX = avX + d + r(20);
  const colW = w - colX - r(22);
  const nameSize = tight ? 26 : compact ? 28 : 32;
  const bubbleH = r(tight ? 46 : compact ? 54 : 60);
  const gap = r(tight ? 6 : 8);
  const blockH = nameSize * 1.2 + gap + bubbleH;
  const top = Math.max(r(12), (h - blockH) / 2);

  const gain = Math.max(0, Number(champion.gain) || 0);
  const gainLabel = gain > 0 ? '+' + gain : '';
  const gainW = gainLabel ? ui.measure(gainLabel, compact ? 17 : 18, '800') + r(20) : 0;

  const name = champion.nickName || '果友';
  const nameMax = colW - (gainLabel ? gainW + r(14) : 0);
  ui.text(name, colX, top, {
    size: nameSize,
    weight: '800',
    color: C.ink,
    maxWidth: nameMax,
  });
  if (gainLabel) {
    const gh = r(compact ? 32 : 36);
    const nameW = Math.min(ui.measure(name, nameSize, '800'), nameMax);
    ui.badge(gainLabel, colX + nameW + r(8), top + (nameSize * 1.2 - gh) / 2, {
      fill: C.lime,
      size: compact ? 17 : 18,
      height: gh,
      padX: r(10),
      outline: false,
    });
  }

  // 嘲讽气泡
  const bubbleY = top + nameSize * 1.2 + gap;
  ui.panel(colX, bubbleY, colW, bubbleH, {
    fill: C.butterSoft,
    radius: bubbleH / 2,
    shadow: false,
    lineWidth: r(3),
  });
  ui.text('「' + tauntFor(round.index, champion.playerId) + '」', colX + r(18), bubbleY + bubbleH / 2, {
    size: compact ? 22 : 25,
    weight: '700',
    color: C.ink,
    baseline: 'middle',
    maxWidth: colW - r(30),
  });

  // 右上角「本题冠军」贴纸
  const tag = '本题冠军';
  const tagSize = compact ? 17 : 18;
  const tagW = ui.measure(tag, tagSize, '800') + r(32);
  ui.badge(tag, w - r(26) - tagW, -r(18), {
    fill: C.butter,
    size: tagSize,
    height: r(40),
    padX: r(16),
    rotate: 6,
    shadow: true,
  });

  ctx.restore();
  return true;
}

function game(app) {
  ui.begin(app, { dots: false, deco: false });
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;
  const tiny = H < 640;
  const view = app.state.view;
  const round = view && view.round;

  if (!view || !round) {
    pageHeader(app, 'game.back', '对局', '加载中…');
    return;
  }

  const phase = app.phase();
  const revealed = round.correctIndex !== null && typeof round.correctIndex !== 'undefined';
  const remain = Math.max(0, round.endsAt - app.now());
  const duration = Math.max(1, round.endsAt - round.startedAt);
  const ratio = remain / duration;
  const sec = Math.max(0, Math.ceil(remain / 1000));
  const urgent = !revealed && sec <= 5;

  // 顶部 HUD
  const top = ui.safeTop() + r(2);
  ui.iconButton(app, 'game.back', 'arrow-left', x, top + r(6), r(76), { iconSize: r(36) });

  const qLabel = '第 ' + (round.index + 1) + ' / ' + round.total + ' 题';
  const qw = ui.measure(qLabel, 22, '800') + r(34);
  ui.badge(qLabel, W / 2 - qw / 2, top + r(12), {
    fill: C.butter,
    size: 22,
    height: r(46),
    rotate: -2,
    shadow: true,
  });

  const score = formatScore(scoreOf(view));
  const pillW = r(176);
  const pillH = r(62);
  ui.panel(W - x - pillW, top + r(14), pillW, pillH, {
    radius: r(31),
    fill: C.card,
    shadow: 'soft',
    lineWidth: r(3),
  });
  ui.icon('coin', W - x - pillW + r(30), top + r(14) + pillH / 2, r(30), { color: C.orangeDeep });
  ui.text(score, W - x - r(26), top + r(14) + pillH / 2, {
    size: 24,
    weight: '800',
    align: 'right',
    baseline: 'middle',
  });

  // 计时
  const timerY = top + r(114);
  const badgeD = r(compact ? 72 : 84);
  ui.panel(x, timerY, badgeD, badgeD, {
    radius: badgeD / 2,
    fill: urgent ? C.berry : C.card,
    shadow: 'hard',
    lineWidth: r(4),
  });
  ui.text(String(sec), x + badgeD / 2, timerY + badgeD / 2, {
    size: compact ? 32 : 38,
    weight: '800',
    align: 'center',
    baseline: 'middle',
    color: C.ink,
  });
  ui.timerBar(x + badgeD + r(14), timerY + badgeD / 2 - r(16), cw - badgeD - r(14), r(32), ratio, {
    segments: 10,
    color: urgent ? C.berry : C.orange,
  });

  // 题目
  const qy = timerY + badgeD + r(compact ? 18 : 24);
  const stemSize = compact ? 30 : 34;
  const lineH = compact ? 44 : 48;
  const maxLines = tiny ? 3 : 4;
  const textW = cw - r(56);
  const lines = ui.wrap(round.stem, textW, stemSize, '700', maxLines);
  const cardH = r(compact ? 78 : 88) + lines.length * r(lineH) + r(compact ? 18 : 24);
  ui.panel(x, qy, cw, cardH, { fill: C.card, radius: r(34), shadow: 'soft', lineWidth: r(4) });
  ui.badge('单选', x + r(24), qy + r(16), {
    fill: C.orange,
    size: 17,
    height: r(36),
    padX: r(12),
    rotate: -4,
  });
  ui.paragraph(round.stem, x + r(28), qy + r(compact ? 66 : 74), textW, {
    size: stemSize,
    weight: '700',
    lineHeight: lineH,
    maxLines,
    color: C.ink,
  });
  // 揭晓：本轮冠军贴纸盖住题卡（选项、计分板保持可见）
  const champion = revealed ? roundChampion(app) : null;
  if (champion) drawChampionCard(app, round, champion, x, qy, cw, cardH, compact);
  if (revealed && !champion && round.myGain > 0) {
    ui.badge('+' + round.myGain, x + cw - r(30), qy - r(20), {
      fill: C.lime,
      size: 22,
      height: r(48),
      padX: r(16),
      rotate: 6,
      shadow: true,
    });
  }

  // 底部：解说气泡 + 玩家计分板（先算高度，再让选项自适应填满）
  const chips = app.chips();
  const bottomY = H - ui.safeBottom();
  const panelH = r(compact ? 128 : 150);
  const panelY = bottomY - panelH - r(10);
  const bubbleH = r(compact ? 62 : 72);
  const bubbleY = panelY - bubbleH - r(8);
  const optionGap = r(compact ? 8 : 10);
  const gapTotal = optionGap * Math.max(0, (round.options || []).length - 1);
  let oy = qy + cardH + r(compact ? 16 : 22);
  const avail = bubbleY - oy - r(12) - gapTotal;
  const optionH = Math.max(
    r(tiny ? 84 : compact ? 92 : 104),
    Math.min(r(compact ? 116 : 152), avail / Math.max(1, (round.options || []).length))
  );
  const blockH = optionH * (round.options || []).length + gapTotal;
  const startY = oy + Math.max(0, (bubbleY - oy - blockH) / 2);

  const opts = round.options || [];
  const CALM = ['#FFF6ED', '#F6FBEE', '#FFFAEC', '#F6F3FF'];
  for (let i = 0; i < opts.length; i++) {
    const st = optionState(app, i);
    const style = ui.OPTION_STYLES[i];
    let fill = CALM[i] || C.card;
    let stroke = ui.alpha(C.ink, 0.22);
    let lw = r(3);
    let shadow = 'soft';
    let textColor = C.ink;
    if (st === 'submitted' || st === 'submitting') {
      fill = C.orangeSoft;
      stroke = C.ink;
      lw = r(4);
    } else if (st === 'correct') {
      fill = C.successSoft;
      stroke = C.success;
      lw = r(5);
      shadow = 'hard';
    } else if (st === 'wrong') {
      fill = C.dangerSoft;
      stroke = C.danger;
      lw = r(5);
      shadow = 'hard';
    } else if (st === 'disabled') {
      fill = '#FFFBF3';
      stroke = ui.alpha(C.ink, 0.08);
      textColor = C.ink2;
    }

    const sy = startY + i * (optionH + optionGap);
    const press = app.pressed && app.pressed.id === 'game.answer' && app.pressed.payload === i;
    const dy = press ? r(4) : 0;
    ui.panel(x, sy + dy, cw, optionH, {
      fill,
      radius: r(26),
      shadow,
      stroke,
      lineWidth: lw,
    });

    const bd = r(compact ? 54 : 62);
    const bx = x + r(18);
    const by = sy + dy + (optionH - bd) / 2;
    ui.fillRound(bx, by, bd, bd, r(bd * 0.32), style.fill);
    ui.strokeRound(bx, by, bd, bd, r(bd * 0.32), C.ink, r(3));
    ui.text('ABCD'[i], bx + bd / 2, by + bd / 2, {
      size: compact ? 24 : 28,
      weight: '800',
      align: 'center',
      baseline: 'middle',
      color: style.ink,
    });

    const hasIcon = st === 'correct' || st === 'wrong';
    const labelW = cw - (bd + r(18) + r(16)) - (hasIcon ? r(74) : r(16));
    const optSize = compact ? 27 : 30;
    const optLines = ui.wrap(opts[i], labelW, optSize, '600', 2);
    const optLineH = optSize * 1.34;
    const textStartY = sy + dy + (optionH - optLines.length * r(optLineH)) / 2;
    optLines.forEach((line, li) => {
      ui.text(line, bx + bd + r(18), textStartY + li * r(optLineH), {
        size: optSize,
        weight: '600',
        color: textColor,
      });
    });

    if (st === 'correct') {
      ctxIconCircle(x + cw - r(44), sy + dy + optionH / 2, r(24), C.success, 'check', '#FFFFFF');
    } else if (st === 'wrong') {
      ctxIconCircle(x + cw - r(44), sy + dy + optionH / 2, r(24), C.danger, 'cross', '#FFFFFF');
    } else if (st === 'submitted' || st === 'submitting') {
      ui.badge('已提交', x + cw - r(24) - r(96), sy + dy + optionH / 2 - r(17), {
        fill: C.orange,
        size: 16,
        height: r(34),
        padX: r(10),
        outline: false,
      });
    }

    if (phase === 'answering' && !revealed && typeof round.myChoice !== 'number') {
      ui.hit(app, 'game.answer', x, sy, cw, optionH, i);
    }
  }

  // 解说气泡
  let say = '点一个你觉得对的答案';
  if (revealed) {
    if (round.myCorrect === true) say = '答对啦！手速 +' + (round.myGain || 0);
    else if (typeof round.myChoice === 'number') say = '差一点，答案是 ' + 'ABCD'[round.correctIndex];
    else say = '没来得及答，答案是 ' + 'ABCD'[round.correctIndex];
  } else if (typeof round.myChoice === 'number') {
    say = '已提交，等其他人…';
  } else if (round.answeredCount >= round.activeCount && round.activeCount > 0) {
    say = '都答完了，马上揭晓';
  } else if (phase === 'answering') {
    say = sec <= 5 ? '最后 ' + sec + ' 秒，快！' : '还剩 ' + sec + ' 秒，别犹豫';
  }

  const mascotSize = bubbleH + r(12);
  const bubbleLeft = x + mascotSize - r(12);
  ui.panel(bubbleLeft, bubbleY, x + cw - bubbleLeft, bubbleH, {
    fill: C.card,
    radius: r(26),
    shadow: 'soft',
    lineWidth: r(3),
  });
  ui.mascot(x + mascotSize / 2, bubbleY + bubbleH / 2, mascotSize, {
    mood: revealed ? (round.myCorrect ? 'happy' : 'wow') : 'happy',
  });
  ui.text(say, bubbleLeft + r(18), bubbleY + bubbleH / 2, {
    size: compact ? 22 : 24,
    weight: '700',
    color: revealed && round.myCorrect ? C.successInk : C.ink,
    baseline: 'middle',
    maxWidth: x + cw - bubbleLeft - r(32),
  });

  // 玩家计分板
  ui.panel(x, panelY, cw, panelH, {
    fill: C.card,
    radius: r(28),
    shadow: 'soft',
    lineWidth: r(3),
  });
  const n = Math.max(1, chips.length);
  const colW = cw / n;
  chips.forEach((p, i) => {
    const ccx = x + colW * (i + 0.5);
    const as = r(compact ? 44 : 52);
    const avY = panelY + r(8);
    ui.avatar(p.avatar, ccx - as / 2, avY, as, {
      ring: p.isMe,
      ringColor: C.orange,
      lineWidth: 2,
    });
    const dotX = ccx + as / 2 - r(1);
    const dotY = avY + as - r(1);
    const statusColor = revealed
      ? (p.correct ? C.success : C.berry)
      : p.answered ? C.success : C.card;
    ctxDot(dotX, dotY, r(10), statusColor, true);
    const c2 = ui.context();
    c2.beginPath();
    c2.arc(dotX, dotY, r(10), 0, Math.PI * 2);
    c2.strokeStyle = C.ink;
    c2.lineWidth = r(2);
    c2.stroke();
    if (revealed) {
      ui.icon(p.correct ? 'check' : 'cross', dotX, dotY, r(13), { color: '#FFFFFF', width: r(2.4) });
    } else if (p.answered) {
      ui.icon('check', dotX, dotY, r(13), { color: '#FFFFFF', width: r(2.4) });
    } else {
      ctxDot(dotX, dotY, r(3), C.ink3, true);
    }

    ui.text(p.nickName, ccx, avY + as + r(5), {
      size: compact ? 17 : 18,
      weight: '800',
      color: p.isMe ? C.ink : C.ink2,
      align: 'center',
      maxWidth: colW - r(4),
    });
    let stateText = '思考中';
    let stateColor = C.ink3;
    if (revealed) {
      stateText = p.correct ? '答对' : '答错';
      stateColor = p.correct ? C.successInk : C.dangerInk;
    } else if (p.answered) {
      stateText = '已答';
      stateColor = C.successInk;
    }
    ui.text(stateText, ccx, avY + as + r(compact ? 24 : 27), {
      size: compact ? 15 : 16,
      weight: '600',
      color: stateColor,
      align: 'center',
    });
  });

  // 倒计时遮罩
  if (phase === 'countdown') {
    drawCountdown(app, round);
  }
}

function ctxIconCircle(cx, cy, radius, fill, kind, iconColor) {
  const ctx = ui.context();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = ui.rpx(2);
  ctx.stroke();
  ui.icon(kind, cx, cy, radius * 1.1, { color: iconColor, width: ui.rpx(3) });
}

function drawCountdown(app, round) {
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const ctx = ui.context();
  const now = app.now();
  const count = Math.max(1, Math.ceil((round.startedAt - now) / 1000));
  ctx.fillStyle = ui.alpha(C.paper, 0.965);
  ctx.fillRect(0, 0, W, H);
  ui.rays(W / 2, H / 2 - r(40), r(30), r(260), 14, ui.alpha(C.butter, 0.32), (now / 2600) % (Math.PI * 2));
  ui.mascot(W / 2 - r(150), H / 2 + r(20), r(96), { mood: 'wow', still: true });
  ui.display(String(count), W / 2, H / 2 - r(140), {
    size: 150,
    align: 'center',
    color: C.lime,
    outlineWidth: r(16),
  });
  ui.text('准备好了吗', W / 2, H / 2 + r(60), {
    size: 28,
    weight: '800',
    color: C.ink,
    align: 'center',
  });
  ui.text('单选题 · 点选项即提交', W / 2, H / 2 + r(108), {
    size: 22,
    color: C.ink2,
    align: 'center',
  });
}

/* ------------------------------- 结算 ------------------------------- */

function result(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;
  const view = app.state.view;
  const final = view && view.final;

  if (!final || !final.rankings) {
    pageHeader(app, 'result.home', '本局结束', '数据加载中…');
    return;
  }

  const rankings = final.rankings;
  const me = rankings.find((p) => p.playerId === view.playerId) || {};
  const total = (view.config && view.config.questionCount) || 0;
  const rate = me.correctCount && total ? Math.round((me.correctCount / total) * 100) : 0;
  const avg = me.correctCount ? formatDuration(me.correctTimeMs / me.correctCount) : '—';

  ui.text('本局结束', W / 2, ui.safeTop() + r(10), {
    size: 26,
    weight: '800',
    color: C.ink2,
    align: 'center',
  });
  ui.iconButton(app, 'result.home', 'cross', W - x - r(72), ui.safeTop() + r(2), r(72), {
    iconSize: r(26),
    shadow: false,
  });

  const podiumTop = ui.safeTop() + r(compact ? 44 : 52);
  podium(app, rankings, podiumTop, compact);
  ui.confetti(0, podiumTop - r(6), W, r(260), 1, Date.now());

  let y = podiumTop + r(compact ? 352 : 430) + r(compact ? 16 : 24);

  // 我的三项数据
  const tileH = r(compact ? 88 : 110);
  const tGap = r(10);
  const tW = (cw - tGap * 2) / 3;
  const tiles = [
    { v: rate + '%', label: '正确率', color: C.limeSoft, accent: C.limeDeep },
    { v: avg, label: '平均用时', color: C.skySoft, accent: C.skyDeep },
    { v: formatScore(me.score), label: '总分', color: C.orangeSoft, accent: C.orangeDeep },
  ];
  tiles.forEach((t, i) => {
    const tx = x + i * (tW + tGap);
    ui.panel(tx, y, tW, tileH, { fill: t.color, radius: r(24), shadow: 'soft', lineWidth: r(3) });
    ui.text(t.v, tx + tW / 2, y + r(16), {
      size: compact ? 28 : 32,
      weight: '800',
      align: 'center',
      color: C.ink,
      maxWidth: tW - r(16),
    });
    ui.text(t.label, tx + tW / 2, y + tileH - r(30), {
      size: 18,
      weight: '700',
      color: t.accent,
      align: 'center',
    });
  });

  y += tileH + r(compact ? 14 : 18);

  // 排名
  const rowH = r(H < 640 ? 68 : compact ? 76 : 84);
  const listPad = r(12);
  const listH = listPad * 2 + rankings.length * rowH;
  ui.panel(x, y, cw, listH, { fill: C.card, radius: r(30), shadow: 'soft' });
  rankings.forEach((p, i) => {
    const ry = y + listPad + i * rowH;
    const isMe = p.playerId === view.playerId;
    if (isMe) {
      ui.fillRound(x + r(8), ry + r(2), cw - r(16), rowH - r(4), r(18), C.orangeSoft);
    }
    medal(ui.context(), x + r(30), ry + rowH / 2, r(22), p.rank);
    ui.avatar(p.avatar, x + r(56), ry + (rowH - r(compact ? 40 : 46)) / 2, r(compact ? 40 : 46), {
      lineWidth: 2,
    });
    ui.text(p.nickName, x + r(116), ry + rowH / 2, {
      size: compact ? 22 : 24,
      weight: '700',
      baseline: 'middle',
      maxWidth: r(180),
    });
    if (isMe) {
      ui.badge('我', x + r(116) + Math.min(ui.measure(p.nickName, compact ? 22 : 24, '700'), r(180)) + r(10), ry + rowH / 2 - r(12), {
        fill: C.orange,
        size: 14,
        height: r(26),
        padX: r(8),
        outline: false,
      });
    }
    ui.text(p.correctCount + '/' + total, x + cw - r(96), ry + rowH / 2, {
      size: 18,
      color: C.ink2,
      align: 'right',
      baseline: 'middle',
    });
    ui.text(formatScore(p.score), x + cw - r(26), ry + rowH / 2, {
      size: compact ? 24 : 26,
      weight: '800',
      align: 'right',
      baseline: 'middle',
    });
  });

  y += listH + r(12);

  // 晒战绩
  const stripH = r(compact ? 76 : 88);
  if (H >= 640 && y + stripH < H - ui.safeBottom() - r(compact ? 128 : 146) - r(10)) {
    ui.panel(x, y, cw, stripH, {
      fill: C.butterSoft,
      radius: r(26),
      shadow: 'soft',
      lineWidth: r(3),
    });
    ui.fillRound(x + r(16), y + r(14), r(48), r(48), r(16), C.butter);
    ui.strokeRound(x + r(16), y + r(14), r(48), r(48), r(16), C.ink, r(2));
    ui.icon('share', x + r(40), y + r(38), r(26), { color: C.ink });
    ui.text('晒战绩', x + r(78), y + r(compact ? 18 : 22), { size: 22, weight: '800' });
    ui.text('把这一局发给朋友看看', x + r(78), y + r(compact ? 46 : 52), {
      size: 18,
      color: C.ink2,
    });
    ui.icon('chevron-right', x + cw - r(28), y + stripH / 2, r(26), { color: C.ink2 });
    ui.hit(app, 'result.share', x, y, cw, stripH);
    y += stripH;
  }

  // 按钮
  const by = H - ui.safeBottom() - r(compact ? 128 : 146);
  ui.button(app, 'result.rematch', view.isOwner ? '再来一局' : '等房主再来一局', x, by, cw, r(compact ? 90 : 100), {
    variant: view.isOwner ? 'primary' : 'ghost',
    size: 30,
    icon: view.isOwner ? 'refresh' : 'clock',
    iconSize: r(34),
    disabled: !view.isOwner || app.state.loading,
  });

  if (!compact) {
    ui.text('本局成绩已计入本周榜 · 点右上角关闭回首页', W / 2, by + r(116), {
      size: 18,
      color: C.ink3,
      align: 'center',
    });
  }
}

function medal(ctx, cx, cy, radius, rank) {
  const colors = { 1: C.butter, 2: '#D9D4CC', 3: '#E3B98F' };
  const fill = colors[rank] || C.cream;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = ui.rpx(2.5);
  ctx.stroke();
  ui.text(String(rank), cx, cy, {
    size: rank <= 3 ? 20 : 18,
    weight: '800',
    align: 'center',
    baseline: 'middle',
    color: C.ink,
  });
}

function podium(app, rankings, topY, compact) {
  const W = ui.width();
  const r = ui.rpx;
  const cx = W / 2;
  const baseY = topY + r(compact ? 352 : 430);
  const t = Date.now();

  ui.rays(cx, topY + r(compact ? 150 : 180), r(24), r(compact ? 210 : 250), 12,
    ui.alpha(C.butter, 0.18), (t / 9000) % (Math.PI * 2));

  const slots = [
    { p: rankings[1], dir: -1, blockH: r(compact ? 104 : 128), av: r(compact ? 76 : 92), fill: C.cream, rankColor: '#D9D4CC' },
    { p: rankings[0], dir: 0, blockH: r(compact ? 136 : 168), av: r(compact ? 100 : 124), fill: C.butterSoft, rankColor: C.butter },
    { p: rankings[2], dir: 1, blockH: r(compact ? 78 : 96), av: r(compact ? 68 : 80), fill: C.grapeSoft, rankColor: '#E3B98F' },
  ];

  slots.forEach((slot, i) => {
    if (!slot.p) return;
    const offset = r(compact ? 122 : 140);
    const bx = cx + slot.dir * offset - r(compact ? 82 : 88) / 2;
    const bw = r(compact ? 82 : 88);
    const blockTop = baseY - slot.blockH;

    ui.fillRound(bx, blockTop + r(7), bw, slot.blockH, r(16), ui.alpha(C.ink, 0.9));
    ui.fillRound(bx, blockTop, bw, slot.blockH, r(16), slot.fill);
    ui.strokeRound(bx, blockTop, bw, slot.blockH, r(16), C.ink, r(4));

    const avX = cx + slot.dir * offset - slot.av / 2;
    const avY = blockTop - slot.av - r(10);
    ui.avatar(slot.p.avatar, avX, avY, slot.av, {
      ring: slot.p.rank === 1,
      ringColor: C.orange,
      lineWidth: 3,
    });

    // 名次币
    medal(ui.context(), avX + slot.av - r(14), avY + r(10), r(16), slot.p.rank);
    if (slot.p.rank === 1) {
      ui.icon('crown', cx, avY - r(14), r(34), { color: C.orangeDeep });
    }

    ui.text(slot.p.nickName, cx + slot.dir * offset, blockTop + r(10), {
      size: compact ? 20 : 22,
      weight: '800',
      align: 'center',
      maxWidth: bw + r(30),
    });
    ui.text(formatScore(slot.p.score), cx + slot.dir * offset, blockTop + r(compact ? 36 : 42), {
      size: compact ? 22 : 26,
      weight: '800',
      align: 'center',
      color: C.ink2,
    });
  });
}

/* ------------------------------- 排行榜 ------------------------------- */

function rank(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;
  const data = app.state.rank || {};

  let y = ui.safeTop() + r(12);
  ui.display('排行榜', x, y, { size: 52, color: C.card, outlineWidth: r(9) });
  ui.text(data.weekText || '本周', x, y + r(66), { size: 22, color: C.ink2, weight: '600' });
  pillButton(app, 'rank.refresh', '刷新', W - x - r(104), y + r(18), r(104), r(54), {
    variant: 'secondary',
    icon: 'refresh',
    iconSize: r(26),
  });

  y += r(compact ? 108 : 116);

  // 我的排名
  const me = data.me;
  const cardH = r(compact ? 112 : 126);
  ui.ticket(x, y, cw, cardH, { fill: C.orangeSoft, shadow: 'hard', radius: r(30) });
  ui.text('我的排名', x + r(34), y + r(18), { size: 20, color: C.ink2, weight: '700' });
  if (data.myRank) {
    const midY = y + r(76);
    ui.text('第', x + r(34), midY, {
      size: 24,
      weight: '800',
      color: C.ink2,
      baseline: 'middle',
    });
    const rankStr = String(data.myRank);
    ui.text(rankStr, x + r(64), midY, {
      size: 44,
      weight: '800',
      color: C.ink,
      baseline: 'middle',
    });
    ui.text('名', x + r(64) + ui.measure(rankStr, 44, '800') + r(8), midY, {
      size: 24,
      weight: '800',
      color: C.ink2,
      baseline: 'middle',
    });
  } else {
    ui.text('未上榜', x + r(34), y + r(52), { size: 30, weight: '800', color: C.ink2 });
    ui.text('去开一局 →', x + r(34), y + r(88), { size: 20, color: C.orangeDeep, weight: '700' });
    ui.hit(app, 'rank.create', x + r(24), y + r(40), r(180), r(78));
  }
  if (me) {
    ui.text(me.score + ' 分', x + cw - r(34), y + r(28), {
      size: 30,
      weight: '800',
      align: 'right',
    });
    ui.text(me.games + ' 场 · ' + me.wins + ' 胜', x + cw - r(34), y + r(70), {
      size: 20,
      color: C.ink2,
      align: 'right',
    });
  } else {
    ui.text('本周还没成绩', x + cw - r(34), y + r(52), {
      size: 20,
      color: C.ink2,
      align: 'right',
    });
  }

  y += cardH + r(compact ? 18 : 22);

  // 榜单
  const top = data.top || [];
  const footerTop = H - ui.safeBottom() - r(132);
  let listBottom = y;
  if (!top.length) {
    const emptyH = r(compact ? 200 : 230);
    ui.panel(x, y, cw, emptyH, { fill: C.card, radius: r(30), shadow: 'soft' });
    ui.mascot(W / 2, y + r(66), r(80), { mood: 'happy' });
    ui.text('本周还没有人上榜', W / 2, y + r(126), { size: 26, weight: '800', align: 'center' });
    ui.text('来当第一个', W / 2, y + r(164), { size: 20, color: C.ink2, align: 'center' });
    ui.button(app, 'rank.create', '建一桌', W / 2 - r(120), y + emptyH - r(64), r(240), r(48), {
      variant: 'secondary',
      size: 22,
      radius: r(24),
    });
    listBottom = y + emptyH;
  } else {
    const maxRows = Math.max(3, Math.floor((footerTop - y - r(34)) / r(compact ? 72 : 82)));
    const shown = top.slice(0, maxRows);
    const rowH = r(compact ? 72 : 82);
    const listH = r(10) + shown.length * rowH + r(10);
    ui.panel(x, y, cw, listH, { fill: C.card, radius: r(30), shadow: 'soft' });
    shown.forEach((p, i) => {
      const ry = y + r(10) + i * rowH;
      const isMe = me && p.uid === me.uid;
      if (isMe) {
        ui.fillRound(x + r(8), ry + r(2), cw - r(16), rowH - r(4), r(18), C.orangeSoft);
        ui.strokeRound(x + r(8), ry + r(2), cw - r(16), rowH - r(4), r(18), C.ink, r(2));
      }
      if (p.rank <= 3) {
        medal(ui.context(), x + r(34), ry + rowH / 2, r(20), p.rank);
      } else {
        ui.text(String(p.rank), x + r(34), ry + rowH / 2, {
          size: 20,
          weight: '800',
          color: C.ink3,
          align: 'center',
          baseline: 'middle',
        });
      }
      const avs = r(compact ? 42 : 50);
      ui.avatar(p.avatar, x + r(62), ry + (rowH - avs) / 2, avs, { lineWidth: 2 });
      ui.text(p.nickName, x + r(126), ry + rowH / 2, {
        size: compact ? 22 : 24,
        weight: '700',
        baseline: 'middle',
        maxWidth: r(150),
      });
      if (isMe) {
        ui.badge('我', x + r(126) + Math.min(ui.measure(p.nickName, compact ? 22 : 24, '700'), r(150)) + r(8), ry + rowH / 2 - r(11), {
          fill: C.orange,
          size: 13,
          height: r(24),
          padX: r(7),
          outline: false,
        });
      }
      ui.text(p.score + ' 分', x + cw - r(28), ry + rowH / 2, {
        size: compact ? 24 : 26,
        weight: '800',
        align: 'right',
        baseline: 'middle',
      });
    });
    if (top.length > shown.length) {
      ui.text('仅展示前 ' + shown.length + ' 名', W / 2, y + listH + r(10), {
        size: 18,
        color: C.ink3,
        align: 'center',
      });
    }
    listBottom = y + listH + (top.length > shown.length ? r(26) : 0);
  }

  const rulesY = Math.min(listBottom + r(14), footerTop - r(44));
  ui.button(app, 'rank.rules', '榜单规则', W / 2 - r(120), rulesY, r(240), r(48), {
    variant: 'text',
    size: 20,
  });
  ui.footer(app, 'nav.rank');
}

/* ------------------------------- 我的 ------------------------------- */

function profile(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;
  const user = app.state.user || {};
  const stats = user.stats || {};

  let y = ui.safeTop() + r(12);
  ui.display('我的', x, y, { size: 52, color: C.card, outlineWidth: r(9) });
  y += r(84);

  // 资料卡
  const cardH = r(compact ? 156 : 176);
  ui.panel(x, y, cw, cardH, { fill: C.card, radius: r(34), shadow: 'hard' });
  ui.avatar(avatarOf(user), x + r(26), y + r(18), r(compact ? 92 : 104), {
    ring: true,
    ringColor: C.orange,
  });
  ui.text(user.nickName || '果友', x + r(compact ? 150 : 170), y + r(30), {
    size: compact ? 30 : 34,
    weight: '800',
    maxWidth: r(180),
  });
  ui.text('累计 ' + (stats.games || 0) + ' 局 · ' + (stats.wins || 0) + ' 胜', x + r(compact ? 150 : 170), y + r(compact ? 74 : 80), {
    size: 20,
    color: C.ink2,
  });
  ui.text('历史最佳 ' + (stats.bestScore || 0) + ' 分', x + r(compact ? 150 : 170), y + r(compact ? 104 : 112), {
    size: 20,
    color: C.ink2,
  });
  const btnW = r(120);
  ui.button(app, 'profile.nick', '改昵称', W - x - btnW - r(20), y + r(24), btnW, r(50), {
    variant: 'secondary',
    size: 20,
    icon: 'edit',
    iconSize: r(24),
    radius: r(20),
  });
  ui.button(app, 'profile.avatar', '换头像', W - x - btnW - r(20), y + r(86), btnW, r(50), {
    variant: 'ghost',
    size: 20,
    icon: 'camera',
    iconSize: r(24),
    radius: r(20),
  });

  y += cardH + r(compact ? 16 : 20);

  // 六宫格数据
  const total = stats.totalAnswered || 0;
  const rate = total ? Math.round(((stats.totalCorrect || 0) / total) * 100) : 0;
  const winRate = stats.games ? Math.round(((stats.wins || 0) / stats.games) * 100) : 0;
  const tiles = [
    { v: String(stats.games || 0), label: '累计场次', fill: C.orangeSoft },
    { v: String(stats.wins || 0), label: '拿下胜利', fill: C.limeSoft },
    { v: winRate + '%', label: '胜率', fill: C.grapeSoft },
    { v: String(total), label: '答题总数', fill: C.skySoft },
    { v: String(stats.totalCorrect || 0), label: '答对题数', fill: C.butterSoft },
    { v: String(stats.bestScore || 0), label: '最佳单局', fill: C.cream },
  ];
  const tGap = r(10);
  const tw = (cw - tGap * 2) / 3;
  const th = r(compact ? 100 : 112);
  tiles.forEach((t, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = x + col * (tw + tGap);
    const ty = y + row * (th + tGap);
    ui.panel(tx, ty, tw, th, { fill: t.fill, radius: r(24), shadow: 'soft', lineWidth: r(3) });
    ui.text(t.v, tx + tw / 2, ty + r(16), {
      size: compact ? 28 : 32,
      weight: '800',
      align: 'center',
      maxWidth: tw - r(16),
    });
    ui.text(t.label, tx + tw / 2, ty + th - r(30), {
      size: 17,
      weight: '700',
      color: C.ink2,
      align: 'center',
    });
  });

  y += th * 2 + tGap + r(compact ? 18 : 22);

  // 菜单
  const sound = app.audio && app.audio.getState ? app.audio.getState() : { music: true, sfx: true };
  const rows = [
    {
      id: 'profile.music',
      icon: 'music',
      label: '背景音乐',
      sub: sound.music ? '菜单 / 对局 / 结算轮播' : '已关闭',
      on: sound.music,
      fill: C.limeSoft,
    },
    {
      id: 'profile.sfx',
      icon: 'bell',
      label: '音效',
      sub: sound.sfx ? '按钮、答对、倒计时提示' : '已关闭',
      on: sound.sfx,
      fill: C.butterSoft,
    },
    { id: 'profile.rules', icon: 'book', label: '玩法说明', sub: '怎么计分、怎么算排名', fill: C.skySoft },
    { id: 'profile.privacy', icon: 'lock', label: '隐私与协议', sub: '我们收集什么、怎么用', fill: C.cream },
  ];
  const rowH = r(compact ? 96 : 108);
  ui.panel(x, y, cw, rows.length * rowH + r(16), { fill: C.card, radius: r(30), shadow: 'soft' });
  rows.forEach((row, i) => {
    const ry = y + r(8) + i * rowH;
    ui.fillRound(x + r(18), ry + r(18), r(54), r(54), r(18), row.fill || C.skySoft);
    ui.icon(row.icon, x + r(18) + r(27), ry + r(18) + r(27), r(28), { color: C.ink });
    ui.text(row.label, x + r(88), ry + r(20), { size: 24, weight: '800' });
    ui.text(row.sub, x + r(88), ry + r(56), { size: 18, color: C.ink2, maxWidth: cw - r(200) });
    if (typeof row.on === 'boolean') {
      const pill = row.on ? '开' : '关';
      const pw = ui.measure(pill, 18, '700') + r(34);
      ui.badge(pill, x + cw - r(26) - pw, ry + rowH / 2 - r(16), {
        fill: row.on ? C.lime : C.disabled,
        size: 18,
        height: r(32),
        padX: r(17),
        outline: false,
      });
    } else {
      ui.icon('chevron-right', x + cw - r(28), ry + rowH / 2, r(26), { color: C.ink3 });
    }
    ui.hit(app, row.id, x, ry, cw, rowH);
    if (i < rows.length - 1) {
      ui.dashedLine(x + r(88), ry + rowH - r(2), x + cw - r(24), ry + rowH - r(2), ui.alpha(C.ink, 0.12), r(8), r(6), r(2));
    }
  });

  y += rows.length * rowH + r(16) + r(compact ? 16 : 20);

  // 邀请
  const promoH = r(compact ? 116 : 144);
  const footerTop = H - ui.safeBottom() - r(132);
  if (H >= 640 && y + promoH < footerTop - r(10)) {
    ui.panel(x, y, cw, promoH, { fill: C.limeSoft, radius: r(30), shadow: 'soft', lineWidth: r(3) });
    ui.mascot(x + r(52), y + promoH / 2, r(compact ? 64 : 76), { mood: 'happy' });
    ui.text('喊朋友来一局', x + r(102), y + r(compact ? 20 : 26), { size: 24, weight: '800' });
    ui.text('熟人房比随机匹配好玩多了', x + r(102), y + r(compact ? 52 : 64), {
      size: 18,
      color: C.ink2,
      maxWidth: cw - r(140),
    });
    ui.icon('chevron-right', x + cw - r(28), y + promoH / 2, r(26), { color: C.limeDeep });
    ui.hit(app, 'home.create', x, y, cw, promoH);
    y += promoH + r(24);
  }

  // 本周榜入口（底部 tab 也有入口，空间不够就先让版本号落脚）
  const rankH = r(compact ? 104 : 130);
  const versionH = r(26);
  if (y + rankH + versionH + r(18) < footerTop - r(4)) {
    ui.panel(x, y, cw, rankH, { fill: C.card, radius: r(28), shadow: 'soft', lineWidth: r(3) });
    ui.text('本周榜', x + r(24), y + r(16), { size: 22, weight: '800' });
    ui.text('看看谁的手速最快', x + r(24), y + rankH - r(34), { size: 17, color: C.ink2 });
    const px = x + cw - r(116);
    const base = y + rankH - r(22);
    const bars = [
      [px + r(4), r(28), C.cream],
      [px + r(34), r(46), C.butter],
      [px + r(64), r(18), C.grapeSoft],
    ];
    bars.forEach((b) => {
      ui.fillRound(b[0], base - b[1], r(24), b[1], r(7), b[2]);
      ui.strokeRound(b[0], base - b[1], r(24), b[1], r(7), C.ink, r(2));
    });
    ui.icon('crown', px + r(46), base - r(46) - r(14), r(22), { color: C.orangeDeep });
    ui.hit(app, 'nav.rank', x, y, cw, rankH);
    y += rankH + r(10);
  }

  ui.text('v0.1.0 · 果果答题', W / 2, Math.min(y + r(2), footerTop - versionH), {
    size: 18,
    color: C.ink3,
    align: 'center',
  });

  ui.footer(app, 'nav.profile');
}

/* ------------------------------- 说明 ------------------------------- */

function rules(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;

  let y = pageHeader(app, 'rules.back', '玩法说明', '四个人，一道题，看谁手快');

  const blocks = [
    ['房主建局', '选题数、每题时长，生成 6 位房间码。', C.orange],
    ['喊人入座', '2–4 人；至少 2 人，房主才能开始。', C.lime],
    ['限时抢答', '点选项即提交；全员答完提前揭晓。', C.butter],
    ['怎么计分', '答对 100 分 + 最多 50 速度分。', C.berry],
    ['怎么排名', '总分 → 答对题数 → 用时 → 加入时间。', C.grape],
    ['周榜规则', '自然周累计；2 人以上有效局计入。', C.sky],
  ];

  const gap = r(12);
  const cw2 = (cw - gap) / 2;
  const cardH = r(compact ? 200 : 236);
  blocks.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = x + col * (cw2 + gap);
    const by = y + row * (cardH + gap);
    ui.panel(bx, by, cw2, cardH, {
      fill: C.card,
      radius: r(28),
      shadow: 'soft',
      lineWidth: r(3),
      stroke: ui.alpha(C.ink, 0.16),
    });
    ui.fillRound(bx + r(18), by + r(18), r(40), r(40), r(14), b[2]);
    ui.strokeRound(bx + r(18), by + r(18), r(40), r(40), r(14), C.ink, r(2));
    ui.text(String(i + 1), bx + r(38), by + r(38), {
      size: 20,
      weight: '800',
      align: 'center',
      baseline: 'middle',
    });
    ui.text(b[0], bx + r(18), by + cardH * 0.40, { size: 22, weight: '800' });
    ui.paragraph(b[1], bx + r(18), by + cardH * 0.40 + r(34), cw2 - r(36), {
      size: 18,
      lineHeight: 28,
      color: C.ink2,
      maxLines: 3,
    });
  });

  y += cardH * 3 + gap * 2 + r(compact ? 20 : 26);

  // 计分示例
  const scoreText = '+100';
  const speedText = '+38';
  const totalText = '138';
  const tiny = H < 640;
  const exH = r(compact ? 88 : 104);
  const by2 = Math.min(y, H - ui.safeBottom() - r(compact ? 150 : 168));
  if (!tiny) {
  ui.panel(x, by2, cw, exH, { fill: C.butterSoft, radius: r(26), shadow: 'soft', lineWidth: r(3) });
  ui.text('举个例子', x + r(20), by2 + r(14), { size: 18, weight: '700', color: C.ink2 });
  const midY = by2 + exH - r(28);
  ui.badge('答对 ' + scoreText, x + r(20), midY - r(17), {
    fill: C.lime, size: 18, height: r(36), padX: r(12),
  });
  const aW = ui.measure('答对 ' + scoreText, 18, '700') + r(24);
  ui.text('+', x + r(20) + aW + r(8), midY, { size: 20, weight: '800', baseline: 'middle', color: C.ink2 });
  const bX = x + r(20) + aW + r(24);
  ui.badge('手速 ' + speedText, bX, midY - r(17), {
    fill: C.sky, size: 18, height: r(36), padX: r(12),
  });
  const bW = ui.measure('手速 ' + speedText, 18, '700') + r(24);
  ui.text('=', x + bX + bW + r(8), midY, { size: 20, weight: '800', baseline: 'middle', color: C.ink2 });
  ui.badge(totalText + ' 分', x + bX + bW + r(24), midY - r(19), {
    fill: C.orange, size: 20, height: r(40), padX: r(14),
  });
  }

  const ctaY = H - ui.safeBottom() - r(compact ? 104 : 120);
  const tipY = by2 + (tiny ? 0 : exH) + r(22);
  const tipH = r(compact ? 76 : 88);
  if (!tiny && tipY + tipH < ctaY - r(12)) {
    ui.mascot(x + r(46), tipY + tipH / 2, r(compact ? 64 : 76), { mood: 'happy' });
    ui.panel(x + r(96), tipY, cw - r(96), tipH, {
      fill: C.cream,
      radius: r(24),
      shadow: 'soft',
      lineWidth: r(3),
      stroke: ui.alpha(C.ink, 0.16),
    });
    ui.text('答错不扣分，放心抢', x + r(118), tipY + r(compact ? 16 : 20), { size: 21, weight: '800' });
    ui.text('手快有分，手慢也有乐', x + r(118), tipY + r(compact ? 46 : 54), { size: 18, color: C.ink2 });
  }

  ui.button(app, 'rules.create', '去开一局', x, ctaY, cw, r(compact ? 90 : 100), {
    variant: 'lime',
    size: 28,
    icon: 'bolt',
    iconSize: r(34),
  });
}

function privacy(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const x = r(40);
  const cw = W - r(80);
  const compact = H < 700;

  let y = pageHeader(app, 'privacy.back', '隐私与协议') + r(26);

  const tabs = [
    { id: 'privacy', label: '隐私政策' },
    { id: 'terms', label: '用户协议' },
  ];
  const tw = (cw - r(8)) / 2;
  tabs.forEach((tab, i) => {
    const tx = x + i * (tw + r(8));
    const active = app.state.privacyTab === tab.id;
    ui.fillRound(tx, y, tw, r(60), r(30), active ? C.orange : C.card);
    ui.strokeRound(tx, y, tw, r(60), r(30), C.ink, r(5));
    ui.text(tab.label, tx + tw / 2, y + r(30), {
      size: 22,
      weight: '800',
      color: C.ink,
      align: 'center',
      baseline: 'middle',
    });
    ui.hit(app, 'privacy.tab', tx, y, tw, r(60), tab.id);
  });

  y += r(78);
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

  const textSize = 20;
  const lineH = 32;
  let contentH = r(20);
  blocks.forEach((b) => {
    const lines = ui.wrap(b[1], cw - r(48), textSize, '400', 30);
    contentH += r(30) + lines.length * r(lineH) + r(14) + r(6);
  });
  const panelH = contentH + r(10);
  ui.panel(x, y, cw, panelH, { fill: C.card, radius: r(30), shadow: 'soft' });
  let cy = y + r(18);
  blocks.forEach((b, i) => {
    ui.text(b[0], x + r(24), cy, { size: 21, weight: '800' });
    const nextY = ui.paragraph(b[1], x + r(24), cy + r(30), cw - r(48), {
      size: textSize,
      lineHeight: lineH,
      color: C.ink2,
    });
    cy = nextY + r(14);
    if (i < blocks.length - 1) {
      ui.dashedLine(x + r(24), cy - r(8), x + cw - r(24), cy - r(8), ui.alpha(C.ink, 0.10), r(8), r(6), r(2));
      cy += r(6);
    }
  });
  y += panelH;

  ui.text('更新日期：2026-10-22', W / 2, Math.min(y + r(16), H - ui.safeBottom() - r(24)), {
    size: 18,
    color: C.ink3,
    align: 'center',
  });
}

/* ------------------------------- 加载 ------------------------------- */

function loading(app) {
  ui.begin(app);
  const W = ui.width();
  const H = ui.height();
  const r = ui.rpx;
  const t = Date.now() / 1000;

  const compact = H < 700;
  ui.rays(W / 2, H / 2 - r(150), r(40), r(compact ? 190 : 220), 12,
    ui.alpha(C.butter, 0.16), (t / 7000) % (Math.PI * 2));
  ui.mascot(W / 2, H / 2 - r(150), r(150), { mood: app.state.error ? 'wow' : 'happy' });
  ui.display('果果答题', W / 2, H / 2 - r(30), {
    size: 64,
    align: 'center',
    color: C.card,
    outlineWidth: r(10),
  });
  ui.text('GUOGUO QUIZ', W / 2, H / 2 + r(46), {
    size: 20,
    weight: '800',
    color: ui.alpha(C.orangeDeep, 0.7),
    align: 'center',
  });

  if (app.state.error) {
    ui.text(app.state.error, W / 2, H / 2 + r(90), {
      size: 22,
      color: C.dangerInk,
      align: 'center',
      maxWidth: W - r(100),
    });
    ui.button(app, 'common.retry', '重试', W / 2 - r(140), H / 2 + r(130), r(280), r(84), {
      variant: 'secondary',
      size: 26,
      icon: 'refresh',
      iconSize: r(30),
    });
  } else {
    for (let i = 0; i < 3; i++) {
      const bob = Math.sin(t * 3 + i * 0.8) * r(6);
      ctxDot(W / 2 - r(28) + i * r(28), H / 2 + r(100) + bob, r(7), C.orange, true);
    }
    ui.text('正在准备房间…', W / 2, H / 2 + r(140), {
      size: 20,
      color: C.ink2,
      align: 'center',
    });
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
  roundChampion,
  tauntFor,
};
