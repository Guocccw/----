/* 本地 Canvas 预览台：把 minigame/js 里的纯 Canvas 绘制跑在浏览器里。 */
(function () {
  const params = new URLSearchParams(location.search);
  const SOURCES = {};
  const CACHE = {};

  const state = {
    screen: params.get('screen') || 'home',
    board: params.get('board') === '1',
    clean: params.get('clean') === '1',
    device: params.get('device') || '375x812',
  };

  document.body.classList.toggle('clean', state.clean);
  document.body.classList.toggle('board', state.board);

  function parseDevice(v) {
    const [w, h] = v.split('x').map(Number);
    return { w, h };
  }

  async function loadSources() {
    const names = ['core', 'ui', 'screens'];
    await Promise.all(
      names.map(async (name) => {
        const res = await fetch('/minigame/js/' + name + '.js', { cache: 'no-store' });
        if (!res.ok) throw new Error('无法加载 ' + name + '.js');
        SOURCES[name] = await res.text();
      })
    );
  }

  function req(id) {
    const key = String(id).replace(/^\.\//, '');
    if (CACHE[key]) return CACHE[key].exports;
    if (!SOURCES[key]) throw new Error('未知模块 ' + key);
    const module = { exports: {} };
    CACHE[key] = module;
    const fn = new Function('require', 'module', 'exports', 'wx', SOURCES[key] + '\n//# sourceURL=' + key + '.js');
    fn(req, module, module.exports, window.wx);
    return module.exports;
  }

  function makeWx() {
    return {
      getWindowInfo() {
        return window.__win;
      },
      getMenuButtonBoundingClientRect() {
        const top = window.__win.safeArea.top;
        return { top: top + 4, bottom: top + 36, left: window.__win.windowWidth - 95, right: window.__win.windowWidth - 12 };
      },
      showToast() {},
      vibrateShort() {},
    };
  }

  function setupViewport(device) {
    const { w, h } = parseDevice(device);
    const top = h >= 700 ? 44 : 20;
    const bottomGap = h >= 700 ? 34 : 0;
    window.__win = {
      windowWidth: w,
      windowHeight: h,
      pixelRatio: 2,
      safeArea: { top, bottom: h - bottomGap, left: 0, right: w },
    };
  }

  function draw(canvas, w, h, screenName) {
    const ui = req('ui');
    const screens = req('screens');
    ui.init(canvas, {
      windowWidth: w,
      windowHeight: h,
      pixelRatio: 2,
      safeArea: { top: window.__win.safeArea.top, bottom: window.__win.safeArea.bottom },
    });
    const app = window.Fixtures.build(screenName);
    const fn = screens[screenName.split('.')[0]] || screens.home;
    fn(app);
    return app;
  }

  function buildSingle() {
    const wrap = document.getElementById('stage');
    const existing = wrap.querySelector('canvas');
    if (existing) existing.remove();
    const canvas = document.createElement('canvas');
    canvas.id = 'screen';
    const { w, h } = parseDevice(state.device);
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';
    wrap.appendChild(canvas);
    draw(canvas, w, h, state.screen);
  }

  function buildBoard() {
    const wrap = document.getElementById('board');
    wrap.innerHTML = '';
    const { w, h } = parseDevice(state.device);
    const scale = state.device === '320x568' ? 0.46 : 0.42;
    window.Fixtures.ORDER.forEach(([name, label]) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const cap = document.createElement('div');
      cap.className = 'cap';
      cap.innerHTML = label + ' <em>' + name + '</em>';
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = Math.round(w * scale) + 'px';
      canvas.style.height = Math.round(h * scale) + 'px';
      draw(canvas, w, h, name);
      cell.appendChild(cap);
      cell.appendChild(canvas);
      wrap.appendChild(cell);
    });
  }

  function buildToolbar() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    window.Fixtures.ORDER.forEach(([name, label]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = name === state.screen ? 'on' : '';
      b.onclick = () => {
        state.screen = name;
        state.board = false;
        const url = new URL(location.href);
        url.searchParams.set('screen', name);
        url.searchParams.delete('board');
        history.replaceState(null, '', url);
        document.body.classList.remove('board');
        buildSingle();
        buildToolbar();
        document.getElementById('meta').textContent = name;
      };
      nav.appendChild(b);
    });

    const select = document.getElementById('device');
    select.value = state.device;
    select.onchange = () => {
      state.device = select.value;
      const url = new URL(location.href);
      url.searchParams.set('device', state.device);
      history.replaceState(null, '', url);
      if (state.board) buildBoard();
      else buildSingle();
    };

    document.getElementById('boardBtn').onclick = () => {
      state.board = !state.board;
      const url = new URL(location.href);
      if (state.board) url.searchParams.set('board', '1');
      else url.searchParams.delete('board');
      history.replaceState(null, '', url);
      document.body.classList.toggle('board', state.board);
      if (state.board) buildBoard();
      else buildSingle();
    };
  }

  async function main() {
    try {
      await loadSources();
      window.wx = makeWx();
      window.__ui = req('ui');
      window.__screens = req('screens');
      setupViewport(state.device);
      buildToolbar();
      if (state.board) buildBoard();
      else buildSingle();
      document.getElementById('meta').textContent = state.screen + ' · ' + state.device;
      window.__ready = true;
    } catch (err) {
      document.getElementById('meta').textContent = '预览失败：' + err.message;
      console.error(err);
    }
  }

  main();
})();
