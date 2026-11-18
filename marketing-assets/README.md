# 营销素材 / PPT Assets

这些截图由 `scripts/export-marketing-assets.mjs` 从真实运行的产品中导出，可直接裁切用于营销策划 PPT、演示视频与社交传播。

| 文件 | 用途 |
| --- | --- |
| `01-home-390.png` | 手机首屏第一印象：品牌、主问题、CTA、状态卡预览 |
| `02-diagnosis-hero-390.png` | 核心诊断报告：准备度、中高风险、最近考试、主要风险 |
| `03-time-allocation-390.png` | 时间决策：环形图与各科时间去向 |
| `04-risk-reason-390.png` | 单科风险原因卡 |
| `05-risk-matrix-390.png` | 时间紧迫度 × 能力缺口风险矩阵 |
| `06-share-card.png` | 1080 × 1440 分享状态卡，可直接用于社媒/PPT |
| `07-week-resource-390.png` | 7 天行动总览与本周复习资源 |
| `08-today-plan-390.png` | “今天到底该做什么”行动卡与反馈入口 |
| `09-dynamic-adjustment-390.png` | 动态调整 Before → After 视觉 |
| `10-home-1440.png` | 桌面端首页整页：首屏、流程、价值主张、决策参数条 |
| `11-diagnosis-hero-1440.png` | 桌面端诊断头图 |
| `12-week-resource-1440.png` | 桌面端本周资源面板 |
| `qr-live.png` | 课堂扫码二维码（1080px 品牌色），指向当前临时公网链接 |
| `live-url.txt` | 当前临时公网链接与生成时间 |

`qr-live.png` 与 `live-url.txt` 是动态素材：由 `npm run share:live` 重新生成，演示进程停止后链接失效。

移动端素材为 2 倍像素密度截图（780px 级别），分享卡为 1080px 宽导出图。

重新生成：

```bash
# 需要先运行 npm run dev
node scripts/export-marketing-assets.mjs
```
