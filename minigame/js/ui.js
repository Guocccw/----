const { COLORS, avatarText, avatarBg } = require('./core');

let canvas = null;
let ctx = null;
let W = 375;
let H = 667;
let S = 0.5;
let DPR = 1;
let SAFE_TOP = 20;
let SAFE_BOTTOM = 0;

const FONT = '"PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';

function init(canvasRef, info) {
  canvas = canvasRef;
  W = info.windowWidth || 375;
  H = info.windowHeight || 667;
  DPR = info.pixelRatio || 1;
  S = W / 750;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  const safe = info.safeArea || {};
  let menuBottom = 0;
  try {
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect();
      if (menu && menu.bottom) menuBottom = menu.bottom;
    }
  } catch (err) {}
  SAFE_TOP = Math.max(safe.top || 20, menuBottom ? menuBottom + 4 : 20);
  SAFE_BOTTOM = Math.max(0, H - (safe.bottom || H));
}

function rpx(v) {
  return v * S;
}

function width() { return W; }
function height() { return H; }
function safeTop() { return SAFE_TOP; }
function safeBottom() { return SAFE_BOTTOM; }
function context() { return ctx; }

function begin(app) {
  app.hits = [];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

function setFont(size, weight) {
  ctx.font = (weight || '400') + ' ' + rpx(size) + 'px ' + FONT;
}

function text(value, x, y, opts) {
  const o = opts || {};
  setFont(o.size || 28, o.weight || '400');
  ctx.fillStyle = o.color || COLORS.text;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'top';
  const str = String(value == null ? '' : value);
  if (o.maxWidth) {
    ctx.fillText(ellipsis(str, o.maxWidth), x, y);
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

function measure(value, size, weight) {
  setFont(size || 28, weight || '400');
  return ctx.measureText(String(value == null ? '' : value)).width;
}

function ellipsis(value, maxWidth) {
  const str = String(value == null ? '' : value);
  if (ctx.measureText(str).width <= maxWidth) return str;
  let out = str;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

function wrap(value, maxWidth, size, weight, maxLines) {
  setFont(size || 28, weight || '400');
  const str = String(value == null ? '' : value);
  const lines = [];
  let line = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      const noStart = '，。、；：！？）》」』%”’…';
      if (noStart.indexOf(ch) >= 0 && line.length > 1) {
        const last = line.slice(-1);
        lines.push(line.slice(0, -1));
        line = last + ch;
      } else {
        lines.push(line);
        line = ch;
      }
    } else {
      line = test;
    }
    if (maxLines && lines.length >= maxLines) break;
  }
  if (!maxLines || lines.length < maxLines) lines.push(line);
  return lines;
}

function paragraph(value, x, y, maxWidth, opts) {
  const o = opts || {};
  const size = o.size || 28;
  const lineHeight = o.lineHeight || size * 1.55;
  const lines = wrap(value, maxWidth, size, o.weight, o.maxLines);
  lines.forEach((line, i) => {
    text(line, x, y + i * rpx(lineHeight), o);
  });
  return y + lines.length * rpx(lineHeight);
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRound(x, y, w, h, r, fill) {
  roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRound(x, y, w, h, r, stroke, lineWidth) {
  roundRect(x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth || 2;
  ctx.stroke();
}

function card(x, y, w, h, opts) {
  const o = opts || {};
  ctx.save();
  if (o.shadow !== false) {
    ctx.shadowColor = 'rgba(122, 63, 32, 0.08)';
    ctx.shadowBlur = rpx(24);
    ctx.shadowOffsetY = rpx(8);
  }
  fillRound(x, y, w, h, o.radius == null ? rpx(32) : o.radius, o.fill || COLORS.surface);
  ctx.restore();
  if (o.stroke) strokeRound(x, y, w, h, o.radius == null ? rpx(32) : o.radius, o.stroke, o.lineWidth || 2);
}

function hit(app, id, x, y, w, h, payload) {
  app.hits.push({ id, x, y, w, h, payload: payload || null });
}

function button(app, id, label, x, y, w, h, opts) {
  const o = opts || {};
  const variant = o.variant || 'primary';
  const disabled = !!o.disabled;
  const radius = o.radius == null ? h / 2 : o.radius;

  let fill = COLORS.primary;
  let stroke = null;
  let color = COLORS.onPrimary;
  let weight = '600';
  let size = o.size || 32;
  let shadow = true;

  if (variant === 'secondary') {
    fill = COLORS.surface;
    stroke = COLORS.primaryBorder;
    color = COLORS.primaryInk;
    size = o.size || 30;
    shadow = false;
  } else if (variant === 'ghost') {
    fill = 'rgba(255,255,255,0.7)';
    stroke = COLORS.border;
    color = COLORS.text2;
    size = o.size || 28;
    shadow = false;
  } else if (variant === 'text') {
    fill = 'transparent';
    color = o.color || COLORS.primaryInk;
    size = o.size || 28;
    weight = '500';
    shadow = false;
  } else if (variant === 'danger') {
    fill = 'transparent';
    color = COLORS.dangerInk;
    size = o.size || 28;
    weight = '500';
    shadow = false;
  }

  if (disabled) {
    fill = variant === 'text' || variant === 'danger' ? 'transparent' : COLORS.disabledBg;
    stroke = null;
    color = COLORS.disabledText;
    shadow = false;
  }

  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(255, 122, 69, 0.28)';
    ctx.shadowBlur = rpx(28);
    ctx.shadowOffsetY = rpx(12);
  }
  if (fill !== 'transparent') {
    fillRound(x, y, w, h, radius, fill);
  }
  ctx.restore();
  if (stroke) strokeRound(x, y, w, h, radius, stroke, 2);

  text(label, x + w / 2, y + h / 2, {
    size,
    weight,
    color,
    align: 'center',
    baseline: 'middle',
  });

  if (!disabled && id) hit(app, id, x, y, w, h, o.payload);
  return { x, y, w, h };
}

function chip(label, x, y, opts) {
  const o = opts || {};
  const size = o.size || 22;
  const padX = o.padX || rpx(16);
  const h = o.height || rpx(40);
  const tw = measure(label, size, '500');
  const w = tw + padX * 2;
  fillRound(x, y, w, h, h / 2, o.fill || '#F6ECE3');
  text(label, x + padX, y + h / 2, {
    size,
    weight: '500',
    color: o.color || COLORS.text2,
    baseline: 'middle',
  });
  return w;
}

function avatar(value, x, y, size, opts) {
  const o = opts || {};
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = o.bg || avatarBg(value);
  ctx.fill();
  if (o.ring) {
    ctx.strokeStyle = COLORS.primary;
    ctx.lineWidth = rpx(4);
    ctx.stroke();
  }
  ctx.restore();
  text(avatarText(value), x + size / 2, y + size / 2, {
    size: 52 * (size / rpx(96)),
    align: 'center',
    baseline: 'middle',
  });
}

function progress(x, y, w, h, value, fill) {
  fillRound(x, y, w, h, h / 2, COLORS.border);
  const v = Math.max(0, Math.min(1, value || 0));
  if (v > 0) fillRound(x, y, Math.max(h, w * v), h, h / 2, fill || COLORS.primary);
}

function ring(cx, cy, radius, value, label, opts) {
  const o = opts || {};
  const v = Math.max(0, Math.min(1, value || 0));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = rpx(8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
  ctx.strokeStyle = o.color || COLORS.primary;
  ctx.lineWidth = rpx(8);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
  text(label, cx, cy - rpx(22), { size: o.size || 32, weight: '700', align: 'center', color: o.textColor || COLORS.text });
}

function back(app, id) {
  const x = rpx(24);
  const y = SAFE_TOP + rpx(16);
  const size = rpx(64);
  ctx.save();
  ctx.shadowColor = 'rgba(122, 63, 32, 0.08)';
  ctx.shadowBlur = rpx(20);
  ctx.shadowOffsetY = rpx(6);
  fillRound(x, y, size, size, size / 2, COLORS.surface);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = rpx(4);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.58, y + size * 0.32);
  ctx.lineTo(x + size * 0.40, y + size * 0.50);
  ctx.lineTo(x + size * 0.58, y + size * 0.68);
  ctx.stroke();
  ctx.restore();
  hit(app, id, x, y, size, size);
  return y + size;
}

function header(title, subtitle) {
  const x = rpx(32);
  let y = SAFE_TOP + rpx(40);
  text(title, x, y, { size: 44, weight: '600' });
  y += rpx(58);
  if (subtitle) {
    text(subtitle, x, y, { size: 26, color: COLORS.text2 });
    y += rpx(40);
  }
  return y;
}

function navIcon(kind, cx, cy, size, color) {
  const h = size;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.10);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'home') {
    const w = h * 0.86;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h * 0.02);
    ctx.lineTo(cx, cy - h * 0.38);
    ctx.lineTo(cx + w / 2, cy - h * 0.02);
    ctx.stroke();
    ctx.strokeRect(cx - w * 0.34, cy - h * 0.04, w * 0.68, h * 0.36);
  } else if (kind === 'rank') {
    // 柱状榜单图标，比奖杯更稳定、比例更清楚
    const barW = h * 0.16;
    const gap = h * 0.10;
    const baseY = cy + h * 0.36;
    const heights = [h * 0.42, h * 0.66, h * 0.52];
    for (let i = 0; i < 3; i++) {
      const bx = cx - (barW * 3 + gap * 2) / 2 + i * (barW + gap);
      const bh = heights[i];
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(bx, baseY - bh, barW, bh, barW / 2)
        : ctx.rect(bx, baseY - bh, barW, bh);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.16, h * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.34, h * 0.34, Math.PI * 1.10, Math.PI * 1.90);
    ctx.stroke();
  }
  ctx.restore();
}

function lineIcon(kind, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'book') {
    roundRect(x + size * 0.12, y + size * 0.08, size * 0.76, size * 0.84, size * 0.10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.30, y + size * 0.08);
    ctx.lineTo(x + size * 0.30, y + size * 0.92);
    ctx.moveTo(x + size * 0.40, y + size * 0.36);
    ctx.lineTo(x + size * 0.76, y + size * 0.36);
    ctx.moveTo(x + size * 0.40, y + size * 0.56);
    ctx.lineTo(x + size * 0.76, y + size * 0.56);
    ctx.stroke();
  } else if (kind === 'lock') {
    ctx.beginPath();
    ctx.arc(x + size * 0.50, y + size * 0.40, size * 0.22, Math.PI, Math.PI * 2);
    ctx.stroke();
    roundRect(x + size * 0.22, y + size * 0.42, size * 0.56, size * 0.48, size * 0.10);
    ctx.stroke();
  }
  ctx.restore();
}

function footer(app, active) {
  const h = rpx(104) + SAFE_BOTTOM;
  const y = H - h;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(0, y, W, h);
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();

  const items = [
    { id: 'nav.home', label: '首页', icon: 'home' },
    { id: 'nav.rank', label: '排行榜', icon: 'rank' },
    { id: 'nav.profile', label: '我的', icon: 'profile' },
  ];
  items.forEach((item, i) => {
    const cw = W / 3;
    const cx = cw * i + cw / 2;
    const color = item.id === active ? COLORS.primaryDark : COLORS.text2;
    navIcon(item.icon, cx, y + rpx(38), rpx(34), color);
    text(item.label, cx, y + rpx(76), { size: 20, align: 'center', color, baseline: 'middle' });
    hit(app, item.id, cw * i, y, cw, h);
  });
}

module.exports = {
  init,
  rpx,
  width,
  height,
  safeTop,
  safeBottom,
  context,
  begin,
  text,
  measure,
  wrap,
  paragraph,
  roundRect,
  fillRound,
  strokeRound,
  card,
  hit,
  button,
  chip,
  avatar,
  progress,
  ring,
  back,
  header,
  footer,
  lineIcon,
  COLORS,
};
