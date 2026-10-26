# Canvas 预览台

把 `minigame/js` 的纯 Canvas 绘制跑在浏览器里，方便调 UI、出截图，不影响小游戏运行时代码。

## 1. 起本地服务

```bash
cd 果果答题
python3 -m http.server 8123
# 或 npm run preview
```

打开 <http://127.0.0.1:8123/preview/index.html>。

- 顶部按钮切页面，`尺寸` 可切 375×812 / 390×844 / 360×780 / 320×568。
- `总览` 一次铺开所有页面。
- URL 参数：`?screen=game.revealed&clean=1&device=375x812&board=1`。

`clean=1` 隐藏工具栏，只留画布；`board=1` 显示总览。

## 2. 出截图（无头 Chrome）

先起一个带调试端口的 Chrome：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --user-data-dir="$PWD/.preview-out/prof" \
  --remote-debugging-port=9333 about:blank
```

再截图：

```bash
node preview/shot.mjs --page "screen=home&clean=1" --out .preview-out/home.png
node preview/shot.mjs --page "screen=game.revealed&clean=1" --out .preview-out/game.png --w 375 --h 812
node preview/shot.mjs --page "board=1&clean=1" --out .preview-out/board.png --full --h 1400
```

参数：`--page` 查询串、`--out` 输出、`--w/--h` 视口、`--scale` 像素比、`--full` 整页、`--wait` 额外等待。

## 3. 假数据

`preview/fixtures.js` 里维护每个页面的关键状态：

```text
home / home.active / create / join / room / room.full
game.answering / game.submitted / game.revealed / game.wrong / game.countdown
result / rank / rank.empty / profile / rules / privacy / loading
```

新增页面状态时，在 `STATES` 里加一条，并把加入 `ORDER` 以便出现在总览里。

## 4. 注意

- 预览台只加载 `core.js` / `ui.js` / `screens.js`，不跑 `app.js` 的网络与轮询。
- 预览里的 `wx` 是桩，`getMenuButtonBoundingClientRect` 用 `safeArea.top + 36` 模拟胶囊。
- `.preview-out/` 是临时产物，已加入 `.gitignore`；`docs/ui/` 里是提交用的定稿截图。
