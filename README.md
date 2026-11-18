# 期末急救站

**大学生 AI 期末时间决策工具**

> 你的时间，还有多少余量？

「期末急救站」不负责搜题、讲题或生成学习资料。它只回答一个核心问题：

> 当多门考试同时逼近、时间有限、掌握程度不同，应该先救哪门、每天各花多久？

当前阶段是 **Marketing Experience Phase**：核心流程和排程算法已经稳定，本阶段重点重新定义第一印象、诊断结果、时间决策、7 天行动、动态调整和传播状态卡。

## 快速启动

```bash
npm install
npm run dev
```

打开终端提示的地址（默认 `http://127.0.0.1:5173/`）。

```bash
npm run build
npm run preview
npm test
```

技术栈：React 19 + TypeScript + Vite。无后端、无登录，数据保存在浏览器 `localStorage`。

## 60～90 秒演示路径

1. 首页：5 秒内理解“这是一次期末状态体检”。
2. 点击「开始我的期末诊断」，录入 3 门考试与每天 3 小时的预算。
3. 诊断页：看到「期末准备度 55/100」「中高风险」「主要问题」和各科风险。
4. 打开「状态卡」，保存或截图一张 3:4 分享卡。
5. 生成「7 天行动」，查看本周复习资源与今天到底该做什么。
6. 选择「完成一部分」并提交反馈。
7. 查看「计划已重新调整」以及 Before → After 的变化。
8. 在计划页再次打开状态卡，完成分享闭环。

## 产品体验与设计系统

整体定位：**高级、年轻、克制的大学生效率产品**。

- 背景：暖米白 `#f3efe5`
- 主色：森林绿 `#1f5a42`
- 深色信息面：墨绿黑 `#11251d`
- 风险色：陶土红 `#ac4938` / 赭金 `#9c732c` / 灰绿 `#507460`
- 大字数字：衬线数字 + 等宽小数字混排
- 分布图表（环形图、堆叠条、图例）使用科目身份色，按录入顺序稳定绑定；风险色只用于徽章、准备度环与风险矩阵
- 卡片：细边框、低阴影、纸张式暖白表面
- 动效：短促入场、环形进度、数字呼吸点；不使用循环装饰动画
- 传播视觉：3:4 状态卡、暖纸纹理、深绿品牌脚注、明确的分享 CTA

设计样式集中在：

- `src/styles.css`：原始基础样式
- `src/marketing.css`：品牌、首页与诊断系统
- `src/marketing-diagnosis.css`：诊断页、矩阵、风险卡
- `src/marketing-plan.css`：7 天行动与动态调整
- `src/marketing-share.css`：分享卡与导出弹窗
- `src/marketing-responsive.css`：320 / 390 / 1440 响应式

## 页面与闭环

| 路由 | 页面 | 作用 |
| --- | --- | --- |
| `/#/` | 首页 | 产品定位、期末状态示例、入口 |
| `/#/setup` | 期末诊断 | 添加、修改、删除考试，设置每日可用时间 |
| `/#/analysis` | 你的期末状态 | 准备度、主要问题、时间分配、风险矩阵、分享卡 |
| `/#/plan` | 未来 7 天 | 本周资源、今天优先、逐日任务、反馈重排 |

完整路径：

```text
期末诊断 → 风险分析 → 时间决策 → 7 天行动 → 执行反馈 → 动态调整
```

## 期末准备度

分析页的核心指标是「期末准备度」。它是展示层的综合状态分，不替代底层风险分：

```text
readiness = 100 - 整体风险分 × 0.55
```

结果限制在 12～96 之间，避免极端分数失去可读性。风险等级映射为：

- 高风险 → 中高风险 / 需要急救
- 中风险 → 中等风险 / 需要聚焦
- 低风险 → 状态较稳 / 状态在线

分析页同时展示：

- 距离最近考试与最近考试科目
- 每天可用时间
- 考试科目数量与高风险科目数量
- 当前主要风险与原因
- 主要问题、风险矩阵、时间分配环形图
- 各科风险原因与建议投入

## 分享状态卡

分享卡是本阶段唯一新增的重要营销功能，入口：

- 诊断页「生成我的状态卡」
- 诊断页底部「状态卡」
- 计划页顶部「分享状态卡」
- 计划页底部「分享我的期末状态」

卡片内容：

- 我的期末状态
- 期末准备度 `55 / 100`
- 状态「中高风险」
- 距离最近考试 `3 天`
- 每日需要 `3h`
- 最需要关注「高等数学」
- 未来 7 天时间去向
- 本周第一行动
- 品牌脚注与「测测你的期末状态 →」

弹窗内可直接「保存图片」，使用 `html-to-image` 导出 **至少 1080px 宽**、3:4 的 PNG。截图和导出图都可以直接用于手机传播、营销 PPT 和演示视频。

## 风险计算

风险分满分为 100：

```text
risk = 时间紧迫度 × 35%
     + 掌握缺口   × 25%
     + 薄弱程度   × 20%
     + 考试重要度 × 20%
```

- 时间紧迫度：按距离考试的天数分段计算。
- 掌握缺口：`(5 - 掌握程度) / 4 × 100`。
- 薄弱程度：根据薄弱章节数量计算。
- 考试重要度：普通 35、重要 68、非常重要 100。

阈值：`高 ≥ 65`，`中 ≥ 42`，其余为低。

整体风险 = `最高风险分 × 55% + 重要度加权平均风险分 × 45%`。

优先级按风险分排序，不是简单按考试日期排序。

## 时间分配

- 计划范围为今天起 7 天。
- 每天可用时间按 0.5 小时递增，系统把它当作硬性上限。
- 初始调度粒度为 30 分钟；每门仍可考的科目在容量允许时获得最低一个时间块。
- 每个科目任务会拆成不超过 60 分钟的块，并绑定薄弱章节、掌握程度对应的行动和优先级。
- 不会把任务安排到该科目考试日之后。
- 计算逻辑位于 `src/lib/planner.ts`，不依赖网络。

## 每日反馈与动态调整

计划页支持三种反馈：

- 全部完成：未来计划保持原节奏。
- 完成一部分：按约 50% 估算，优先勾销高风险任务。
- 没有完成：今日未完成任务进入顺延池。

重排规则：

1. 未完成任务按风险和优先级排序，优先保留高风险内容。
2. 每天最多使用当天可用时间的 50% 承接顺延，避免全部堆到第二天。
3. 剩余容量继续按风险分配常规任务。
4. 所有日期重新校验，任何一天都不会超过每日上限。
5. 顶部展示「计划已重新调整」、指标卡和 Before → After 科目投入变化。
6. 反馈、调整记录和计划一起持久化。

核心实现位于 `src/lib/feedback.ts`。本阶段没有修改风险、排程和重排算法，只补充了展示层的前后对比字段。

## AI 接口

`src/services/ai.ts` 定义四个解释能力：

- `explainRisk`：解释风险排序。
- `suggestChapterTask`：把薄弱章节转成可执行任务描述。
- `explainAllocation`：解释时间分配理由。
- `suggestAdjustment`：生成执行反馈后的调整建议。

默认使用本地确定性实现，不发起网络请求。核心计算始终不依赖 AI。

如需远程解释层：

```bash
VITE_AI_ENDPOINT=https://your-proxy.example.com/ai
```

接口约定：

```http
POST /ai
Content-Type: application/json

{ "task": "explain-risk", "input": { ... }, "locale": "zh-CN" }
```

返回：

```json
{ "text": "给用户看的简短解释" }
```

前端不保存 API Key；请求失败或超时会自动回退到本地解释。

## 测试

```bash
npm test
npm run build
```

当前包含 **25 个自动化测试**，覆盖：

- 风险排序不按日期简单排序。
- 掌握度、薄弱章节和重要度对优先级的影响。
- 7 天计划生成、任务字段完整性、每日时长上限。
- 不在考试日之后安排任务。
- 推荐复习时间与计划总量一致。
- 部分完成、全部完成、全部未完成三种反馈。
- 高风险任务优先、顺延不过量、每日上限仍成立。
- 重复反馈被拒绝。
- 表单校验规则。
- 本地 AI 解释层不改变计算逻辑。
- 营销诊断报告的 readiness 范围、状态文案和分配总量。
- 科目身份色按录入顺序稳定绑定，不随优先级变化。
- 主要问题文案随风险状态分支，且不使用固定套话。

### 已验证

- 320px、390px、1440px 无横向滚动。
- 完整移动端流程：录入 → 诊断 → 分享卡 → 7 天计划 → 部分完成反馈 → 调整 → 刷新持久化。
- 分享卡下载成功，导出 `1080 × 1440` PNG。
- 控制台无报错。

### 可选浏览器自检

需要本机 Chrome 和正在运行的 dev server：

```bash
node scripts/verify-flow.mjs
node scripts/verify-flow.mjs 320
node scripts/verify-desktop.mjs
```

脚本会把截图写入 `screenshots/`，并在控制台输出校验结果。

### PPT 素材

`marketing-assets/` 已整理好可直接用于营销 PPT 的核心视觉截图，包含首页、诊断头图、时间分配、风险矩阵、7 天总览、今日行动、动态调整和 1080 × 1440 分享卡。说明见 `marketing-assets/README.md`。

重新导出：

```bash
node scripts/export-marketing-assets.mjs
```

## 永久托管（GitHub Pages）

- 站点：<https://exile-wzq.github.io/final-exam-rescue/>（长期有效，演示当天无需启动本机服务）
- 仓库：<https://github.com/exile-wzq/final-exam-rescue>（公开，免费版 Pages 要求）
- 部署：`.github/workflows/deploy.yml`。推送 main 后 GitHub Actions 自动构建并发布，约 1 分钟生效
- 永久二维码：`marketing-assets/qr-permanent.png`（1080px 品牌色）。链接不变则二维码永远不用换
- 更新流程：改代码 → `npm test` → `git add -A && git commit && git push` → 等 Actions 变绿 → 站点自动更新
- 本机环境备注（均为仓库级配置，不影响系统）：gh 配置目录在 `scripts/.gh-config`（调用 gh 时需设 `GH_CONFIG_DIR` 指向它）；git 凭据助手指向仓库内 gh；`.git/config` 以空值覆盖全局失效代理（127.0.0.1:7890）
- 自检：`node scripts/verify-live.mjs https://exile-wzq.github.io/final-exam-rescue/`（微信 UA + 截图）

## 课堂扫码演示（临时公网链接，备用）

一条命令把本机产品发布为临时 https 公网链接，并生成品牌色二维码，台下微信扫码关注即开：

```bash
npm run share:live             # 产物预览 + cloudflared 隧道 + 生成二维码
npm run share:stop             # 停止演示，链接随之失效
node scripts/verify-live.mjs   # 演示前以微信内置浏览器 UA 自检
```

- 链接与二维码写入 `marketing-assets/live-url.txt` 与 `marketing-assets/qr-live.png`（1080px，墨绿 × 暖米白，可直接放 PPT 结尾页）。
- 隧道免注册（cloudflared quick tunnel，二进制在 `scripts/bin/cloudflared.exe`）。**链接仅在 share:live 进程运行期间有效**；重启会生成新链接与新二维码，PPT 中的二维码需同步替换。
- `vite.config.ts` 的 `preview.allowedHosts` 已放行 `.trycloudflare.com`，否则 Vite 会以 403 拒绝隧道转发的 Host。
- 微信注意：扫码后在内置浏览器直接打开；若出现「继续访问」确认页点继续即可；iOS 微信内分享卡「保存图片」可能受限，可用长按截图兜底。
- 需要长期有效的二维码（提交版 PPT / 报告）时改用静态托管部署，临时链接不适合长期放置。

## 项目结构

```text
final-exam-rescue/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ public/
│  └─ favicon.svg
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ styles.css
│  ├─ marketing.css
│  ├─ marketing-diagnosis.css
│  ├─ marketing-plan.css
│  ├─ marketing-share.css
│  ├─ marketing-responsive.css
│  ├─ types.ts
│  ├─ components/
│  │  ├─ AppHeader.tsx
│  │  ├─ StepIndicator.tsx
│  │  ├─ RiskBadge.tsx
│  │  ├─ PriorityBadge.tsx
│  │  ├─ ProgressBar.tsx
│  │  ├─ AllocationBar.tsx
│  │  ├─ PlanPreviewCard.tsx
│  │  ├─ ReadinessRing.tsx
│  │  ├─ RiskMatrix.tsx
│  │  ├─ TimeDonut.tsx
│  │  ├─ ShareCard.tsx
│  │  └─ ShareCardModal.tsx
│  ├─ pages/
│  │  ├─ HomePage.tsx
│  │  ├─ SetupPage.tsx
│  │  ├─ AnalysisPage.tsx
│  │  └─ PlanPage.tsx
│  ├─ lib/
│  │  ├─ risk.ts
│  │  ├─ planner.ts
│  │  ├─ feedback.ts
│  │  ├─ marketing.ts
│  │  ├─ validation.ts
│  │  ├─ storage.ts
│  │  ├─ dates.ts
│  │  ├─ exams.ts
│  │  ├─ format.ts
│  │  └─ ids.ts
│  ├─ services/
│  │  └─ ai.ts
│  └─ test/
│     ├─ risk.test.ts
│     ├─ planner.test.ts
│     ├─ feedback.test.ts
│     ├─ ai.test.ts
│     └─ marketing.test.ts
├─ scripts/
├─ marketing-assets/          # 可直接用于 PPT 的视觉素材
└─ README.md
```

## 已知限制

- 纯前端 MVP，无后端、登录、多设备同步；清除浏览器数据会丢失计划。
- 计划固定为生成日起 7 天；隔天打开旧计划会提示重新制定，不会自动滚动到新的 7 天窗口。
- “完成一部分”使用约 50% 估算，暂不支持逐任务勾选或手动拖动。
- 每天可用时间按 0.5 小时递增；初始排程粒度为 30 分钟。
- 分享卡使用浏览器端 PNG 导出；部分 iOS/Safari 版本对下载行为支持不同，仍可直接截图保存。
- 风险权重和准备度映射是 MVP 经验值，没有经过真实用户数据校准。
- 远程 AI 是可选解释层，需要自行提供后端代理。
