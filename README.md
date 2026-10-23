# 果果答题

微信小游戏 · 熟人房间答题。2–4 位朋友输入同一个 6 位房间码，限时抢答 ABCD 选择题，按答对与速度计分，结算后进入站内周榜。

> 2026-10-23：项目已切换为**微信小游戏（Canvas）**，当前编译入口在 `minigame/`。
> 原 `miniprogram/` 是 WXML 小程序版本，保留作参考，不再参与编译。
>
> 当前开发环境：`cloud1-d3gvxmgkx8fcfc083`；`api` / `cron` / `setup` 已部署，7 个集合和 20 道题已初始化。

> 产品、技术与 UI 设计分别见：
> [需求文档](docs/需求文档.md) · [实施文档](docs/实施文档.md) · [UI 设计文档](docs/UI设计文档.md)

## 当前实现

- 微信小游戏 Canvas 客户端（JavaScript，无构建链）。
- 云开发后端：`api` 云函数 + `cron` 定时任务。
- 完整主流程：
  - 静默登录、默认水果头像/昵称、昵称/头像编辑。
  - 首页创建/加入、6 位房间码、分享卡片。
  - 等待页座位、房主开始、离开、房主转移、心跳/离线状态。
  - 对局：服务端计时、点击即提交、全员/超时结算、3 秒揭晓、进入下一题。
  - 结算：领奖台、排名、正确率/平均用时、再来一局、晒战绩。
  - 周榜：Top 10 展示、我的排名、本周周期。
  - 断线恢复、轮询退避、房间过期清理。
- 题库：20 道开发占位题，附 `scripts/questions.seed.json`，可覆盖 10/15/20 题配置。
- 领域与房间流程测试：`npm test`。

## 目录

```text
minigame/               当前小游戏客户端（编译入口）
  game.js               入口
  game.json             小游戏配置
  js/app.js             状态、路由、网络、轮询
  js/screens.js         Canvas 页面绘制
  js/ui.js              Canvas 基础绘制
  js/core.js            api / clock / 主题 / 工具
miniprogram/            旧版 WXML 小程序（参考，不再编译）
cloudfunctions/
  api/                  业务云函数（auth / room / rank / event）
  cron/                 定时清理、榜单补偿
  setup/                一次性初始化集合与 20 道题库
scripts/questions.seed.json
tests/domain/           计分、排名、周 Key、结算单测
tests/integration/      内存数据库房间主流程
tests/canvas/           Canvas 页面渲染冒烟测试
docs/                   需求 / 实施 / UI 文档
```

## 快速开始

### 1. 准备小游戏

1. 用微信开发者工具导入仓库根目录，项目类型选「小游戏」，不要选「小程序」。
2. `project.config.json` 已设置 `compileType: "game"`、`miniprogramRoot: "minigame/"`，并保留你的小游戏 AppID。
3. 如果开发者工具仍提示 `miniprogram/game.json` 或项目列表里显示成 `weapp`，说明项目被缓存成小程序：先关闭项目窗口，在项目列表里**移除项目**（不删磁盘文件），再重新导入；必要时删除 `project.private.config.json`。
4. 重新导入后项目类型应显示为「小游戏」，编译入口为 `minigame/game.js`。
5. 开通云开发，创建一个环境（建议 dev/prod 分开）。
6. 如果使用非默认环境，把环境 ID 填到 `minigame/js/core.js` 的 `ENV_ID`；留空则使用默认环境。

### 2. 创建数据库集合

当前环境已由 `cloudfunctions/setup` 初始化；新环境可先部署并调用一次 `setup`，也可以手动创建以下集合：

```text
users
rooms
room_views
games
questions
leaderboards_weekly
event_batches
```

### 3. 设置权限

当前 Canvas 小游戏所有数据都通过云函数读写，**所有集合都关闭客户端读写**（云函数使用管理员权限，不受影响）：

```json
{
  "read": false,
  "write": false
}
```

> 旧 WXML 小程序版需要 `room_views` 的自定义读规则 `doc.openid == auth.openid`；当前 `minigame/` 不直接读数据库，不需要开放。上线前务必确认 `questions`、`rooms` 客户端不可读，否则答案可能泄露。

> 不要把 `rooms`、`questions`、`games` 设为公开读；答案在 `rooms.questionPool` / `questions.answerIndex` 中。
> 新环境初始化：部署 `cloudfunctions/setup` 后调用一次 `wx.cloud.callFunction({ name: 'setup' })`，会自动创建集合，并仅在 `questions` 为空时导入 20 道题。已有数据不会覆盖。


### 4. 创建索引

至少创建以下索引（控制台 → 数据库 → 索引管理）：

| 集合 | 字段 |
|---|---|
| `rooms` | `status` 升序 + `lastActivityAt` 升序 |
| `room_views` | `roomCode` 升序 |
| `games` | `statsApplied` 升序 + `endedAt` 升序 |
| `games` | `roomCode` 升序 + `endedAt` 降序（可选） |
| `leaderboards_weekly` | `weekKey` 升序 + `visible` 升序 + `rankScore` 降序 + `firstRankAt` 升序 |
| `questions` | `enabled` 升序 + `category` 升序 |
| `event_batches` | `serverTs` 升序 |

### 5. 导入题库

开发期把 `scripts/questions.seed.json` 导入 `questions` 集合（云开发控制台支持 JSON 导入；若控制台要求 JSON Lines，把数组拆成每行一个对象）。生产题库请替换为已审核内容，至少准备 20 道。

题目字段：

```json
{
  "category": "general",
  "stem": "题干",
  "options": ["A", "B", "C", "D"],
  "answerIndex": 0,
  "explain": "解析（可空）",
  "enabled": true,
  "source": "internal",
  "version": 1
}
```

### 6. 部署云函数

1. 在开发者工具中右键 `cloudfunctions/api` →「上传并部署：云端安装依赖」。
2. 同样部署 `cloudfunctions/cron` 和 `cloudfunctions/setup`。
3. 云函数超时建议：`api` 10 秒、`cron` 60 秒；内存 256MB。
4. `cron/config.json` 已包含两个定时触发器（每 10 分钟清理、每天 03:20 清理）。如果控制台没有自动创建，请手动添加：
   - `0 */10 * * * * *`
   - `0 20 3 * * * *`

### 7. 运行

1. 编译小游戏，首次会调用 `auth.login` 创建用户。
2. 用两个微信号（或真机 + 开发者工具）创建房间、加入、开始。
3. 至少 2 人才能开始；开发时可用两个账号。
4. 对局结束后看结算和排行榜。

## 本地校验

```bash
npm test
```

会运行 `tests/domain` 的纯函数单测、`tests/integration` 的内存数据库房间主流程（创建→加入→10 题→结算→再来一局→离开），以及 `tests/canvas` 的 Canvas 页面渲染冒烟测试。

## 接口

客户端统一调用云函数 `api`：

```js
wx.cloud.callFunction({
  name: 'api',
  data: { action: 'room.create', data: { config: { questionCount: 10, durationSec: 15 } } },
});
```

主要 action：

```text
auth.login
user.updateProfile
user.updateSettings
room.create / join / state / heartbeat / leave / start
room.answer / settle / advance / rematch
rank.meta / rank.weekly
event.report
```

所有响应统一为 `{ ok, data, error, serverTime }`。房间状态由服务端权威计时/判分；客户端只读自己的 `room_views` 快照。

## 常见问题

- **仍报 `miniprogram/game.json` 未找到**：项目被缓存成小程序。关闭项目窗口 → 项目列表移除项目（不删磁盘）→ 重新导入；项目类型应为「小游戏」。
- **项目列表里 `compileType` 是 `weapp`**：同上，必须移除后重新导入，改 `project.config.json` 不够。
- **启动后提示「请先开通云开发」/`-601034`**：这个 AppID 还没有开通云开发。在开发者工具点「云开发」创建环境；非默认环境把环境 ID 填到 `minigame/js/core.js` 的 `ENV_ID`；再部署 `cloudfunctions/api`。
- **开始游戏提示题库不足**：`questions` 集合至少导入 20 道题，或把创建页题数改成 10。

## 重要说明

- **小游戏客户端**：首版为降低构建复杂度使用 Canvas + JavaScript；原 WXML 小程序版本保留在 `miniprogram/` 供参考。
- **UI 差异**：`docs/UI设计文档.md` 描述的是 WXML 小程序版；Canvas 版沿用同一套颜色、字号、按钮和页面结构，但布局由 Canvas 绘制，不再有原生组件。
- **排行榜是站内榜**：小游戏没有开放数据域，无法读取微信好友成绩；房间内才是好友对战。
- **统计补偿**：`applyGameStats` 为尽力写入，失败由 `cron` 重试；极端情况下可能重复累计，P1 可改为完整事务。
- **未实现（P1/P2）**：踢人、总榜、音效资源、隐私协议法务定稿、深色模式、头像图片内容安全、同群榜。
- **隐私**：上线前请替换 `minigame/js/screens.js` 中的隐私/协议文案，并在小游戏后台配置用户隐私保护指引。

## 部署前检查

- [ ] `appid` 已替换，云环境 ID 正确。
- [ ] 7 个集合已创建，权限规则已配置。
- [ ] 索引已创建。
- [ ] `questions` 至少 20 道可用题。
- [ ] `api`/`cron` 已部署，定时触发器生效。
- [ ] 两个账号可完成创建 → 加入 → 开始 → 结算。
- [ ] `room_views` 只能读自己的文档（用规则模拟器验证）。
