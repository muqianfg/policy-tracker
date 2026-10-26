# html-video 操作手册（本机实测版）

> 环境实测：2026-10-18
> 结论：**只缺 ffmpeg**，其余全部就绪。

## 〇、环境核查结果

| 依赖 | 要求 | 本机状态 |
| --- | --- | --- |
| Node.js | 20+ | ✅ v24.16.0 |
| pnpm | 9+ | ✅ 11.5.2 |
| git | — | ✅ 2.54.0 |
| Chromium | — | ✅ Playwright 已装 |
| **ffmpeg** | 较新版本 | ❌ **缺**（PATH 与 Playwright 缓存都没有） |
| winget | — | ✅ 可用于安装 |
| 磁盘 | — | ✅ C 67.7GB / D 214.3GB |

---

## 一、先理解一条核心机制（决定了整个流程）

**html-video 里：一个 project = 一个模板 = 一个画面。**

而**所有模板的单帧上限都是 30 秒**（实测 frame-product-promo、frame-pentagram-stat、frame-bold-signal 等均如此）。

这意味着：

| 视频时长 | 需要多少帧 | 每帧平均 |
| --- | --- | --- |
| 3 分钟（180s） | **6~10 帧** | 18~30s |
| 8 分钟（480s） | 16~24 帧 | 20~30s |
| 20 分钟（1200s） | **40~60 帧** | 20~30s |
| 29 分钟（1740s） | 58~87 帧 | 20~30s |

**所以流程不是「做一个视频」，而是「做 N 个片段，然后拼起来」。**

> 这条机制正好对上我们的口播稿结构：**一段口播 = 一块画面 = 一个 project**。

---

## 二、完整流程（6 步）

### 第 1 步 · 装 ffmpeg

```powershell
winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
# 装完重开终端，验证：
ffmpeg -version
```

> winget 失败时的备选：下载 https://www.gyan.dev/ffmpeg/builds/ 的 ffmpeg-release-essentials.zip，解压后把 bin 目录加进 PATH。

### 第 2 步 · 下载并构建 html-video

```powershell
cd D:\
git clone https://github.com/nexu-io/html-video
cd html-video
pnpm install          # 首次约 3~10 分钟（monorepo，依赖较多）
pnpm -r build         # 构建所有包，约 1~3 分钟
node packages/cli/dist/bin.js doctor   # 自检
```

doctor 会告诉你：装了哪些渲染引擎、能不能找到 Chromium、ffmpeg 是否可用。**这一步不通过就不要往下走。**

### 第 3 步 · 选模板

```powershell
# 按意图搜索
node packages/cli/dist/bin.js search-templates --intent "数字卡片 数据对比 政策指标" --top 5

# 看某个模板的完整参数（槽位、时长上下限、许可）
node packages/cli/dist/bin.js inspect-template frame-pentagram-stat
```

我们内容用得上的候选：

| 模板 | 用途 | 单帧上限 |
| --- | --- | --- |
| frame-pentagram-stat | 单个大数字 + 标签 | 6s |
| frame-data-rollup | 数字滚动 + 柱状（引擎为 Remotion） | 8s |
| frame-bold-signal | 标题卡（section/label/title） | 6s |
| frame-swiss-grid | 规整排版 / 多要点 | 30s |
| frame-nyt-graph | 折线图 | 30s |
| frame-decision-tree | 决策树 / 分支 | 30s |
| frame-liquid-bg-hero | 主视觉大标题 | — |
| frame-logo-outro | 片尾落版 | — |

### 第 4 步 · 先做**一帧**跑通（关键，别跳）

```powershell
# ① 建项目（返回 project_id）
node packages/cli/dist/bin.js project-create --name "t01" --intent "数字卡片" --aspect 16:9

# ② 套模板（把 <PID> 换成上一步返回的 id）
node packages/cli/dist/bin.js project-set-template <PID> --template frame-pentagram-stat

# ③ 看这个模板要哪些变量（inputs.schema 就是）
node packages/cli/dist/bin.js inspect-template frame-pentagram-stat
```

然后写一个 vars01.json（变量名以 schema 为准，例如）：

```json
{
  "label": "河北 · 延期开工项目",
  "headline": "69",
  "subtitle": "个 · 另有 16 个取消建设计划",
  "anchor": "山西清退 31 个",
  "duration_sec": 8
}
```

```powershell
# ④ 灌入变量
node packages/cli/dist/bin.js project-set-vars <PID> --vars-file vars01.json

# ⑤ 预览（生成 HTML，浏览器打开看效果）
node packages/cli/dist/bin.js project-preview <PID>

# ⑥ 渲染成 MP4
node packages/cli/dist/bin.js project-render <PID> --output out\f01.mp4 --stream-progress
```

**这一帧出来之后，再批量做剩下的。** 否则可能白做 8 帧才发现字体、分辨率或时长设置不对。

### 第 5 步 · 批量做其余帧

每一帧重复第 4 步。**建议写一个脚本**，把「帧清单 + 每帧变量」放在一个 JSON 里，循环调用 CLI。

示意（帧清单 frames.json）：

```json
[
  { "id": "f01", "template": "frame-liquid-bg-hero", "vars": { "title": "储能项目正在被清退" } },
  { "id": "f02", "template": "frame-pentagram-stat", "vars": { "headline": "69" } },
  { "id": "f03", "template": "frame-data-rollup",   "vars": { "data": { "items": [] } } }
]
```

按我们的口播稿结构对应：

| 口播段落 | 模板类型 |
| --- | --- |
| 第 1 段 钩子 | 主视觉大标题（frame-liquid-bg-hero / frame-bold-signal） |
| 第 2 段 核心概念 | 标题卡 + 一句话（frame-bold-signal） |
| 第 3 段 验证方法（35%） | 多要点 / 决策树（frame-swiss-grid / frame-decision-tree） |
| 第 4 段 误区 | 对比（frame-swiss-grid） |
| 第 5 段 收尾 | 片尾（frame-logo-outro） |

### 第 6 步 · 拼接 + 配音

**拼接**（同编码参数时可直接 copy，最快）。先写一个 list.txt，每行一条文件路径，格式为：

```
file D:\自动化任务\video\out\f01.mp4
file D:\自动化任务\video\out\f02.mp4
```

然后：

```powershell
ffmpeg -f concat -safe 0 -i out\list.txt -c copy out\final_silent.mp4
```

**配音有两条路**：

| 方案 | 做法 | 成本 |
| --- | --- | --- |
| **A. 内置 MiniMax** | 在 studio（node packages/cli/dist/bin.js studio → 127.0.0.1:3071）Settings→Audio 填 API key，在 Soundtrack 面板生成旁白与配乐，ffmpeg 自动混入（音乐压低到人声下） | **付费** |
| **B. 外部免费 TTS** | 用 Edge TTS 等逐段生成音频 → 测量每段时长 → 回填到各帧 duration_sec → 再用 ffmpeg 把整条音频混到 final_silent.mp4 | 免费，但要自己做时长对齐 |

外部 TTS 混音命令：

```powershell
ffmpeg -i out\final_silent.mp4 -i out\voice.mp3 -c:v copy -c:a aac -shortest out\final.mp4
```

---

## 三、同步这件事怎么解决（最重要）

**不要让音频去追画面，要让画面去等音频。**

```
① 口播稿按段切分（一段 = 一帧）
② 每段单独生成音频  → 得到该段真实时长
③ 把时长写进该帧的 duration_sec
④ 渲染时这一帧就正好显示那么久
```

因为**一段口播严格对应一帧**，所以不需要语音对齐算法，也不会漂移。

---

## 四、一个诚实的提醒

按上面的机制：**20 分钟长视频 = 40~60 个 project = 40~60 次渲染**，管理成本会很高（每个 project 要 create / set-template / set-vars / render 四次调用）。

所以我的建议是：

| 形态 | 用什么 | 理由 |
| --- | --- | --- |
| **日更 3 分钟短视频** | ✅ **html-video** | 6~10 帧，模板够用，流程轻 |
| **周更 20 分钟长视频** | ⚠️ 先别用 | 40~60 帧，**更合适的是直接用 Remotion 写时间轴**（一个 composition 管所有帧，不用反复调 CLI） |

**先跑通 3 分钟这一档**，验证视觉与同步；等节奏稳定、确定要做 20 分钟档时，再决定是继续堆 html-video 还是转 Remotion。

---

## 五、最小验证路径（今天就能做）

```
1. winget install ffmpeg                  （5 分钟）
2. git clone + pnpm install + build       （10~15 分钟）
3. doctor 自检                            （1 分钟）
4. 做一帧 frame-pentagram-stat 并渲染      （5 分钟）
5. 看 MP4 效果 —— 决定要不要继续
```

**第 4 步的产出决定一切。** 如果那一帧的中文字体、数字排布、动画效果能接受，这条路就通；不能接受，就要么换模板，要么直接上 Remotion 自己写。
