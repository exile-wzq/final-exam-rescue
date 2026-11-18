import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs/promises'

const outDir = path.resolve('marketing-assets')
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})

async function fillSetup(page) {
  const cards = page.locator('.exam-editor')
  await cards.nth(0).locator('input[type="text"]').first().fill('高等数学')
  await cards.nth(0).locator('input[type="date"]').fill('2026-11-21')
  await cards.nth(0).getByRole('radio', { name: /完全不会|不会/ }).click()
  await cards.nth(0).getByRole('radio', { name: '非常重要' }).click()
  await cards.nth(0).locator('input[placeholder*="极限"]').fill('极限、级数、微分方程')

  await page.getByRole('button', { name: '添加一门考试' }).click()
  const card2 = page.locator('.exam-editor').nth(1)
  await card2.locator('input[type="text"]').first().fill('概率论')
  await card2.locator('input[type="date"]').fill('2026-11-25')
  await card2.getByRole('radio', { name: /不太熟/ }).click()
  await card2.getByRole('radio', { name: '重要', exact: true }).click()
  await card2.locator('input[placeholder*="极限"]').fill('随机变量、数字特征')

  await page.getByRole('button', { name: '添加一门考试' }).click()
  const card3 = page.locator('.exam-editor').nth(2)
  await card3.locator('input[type="text"]').first().fill('计算机网络')
  await card3.locator('input[type="date"]').fill('2026-11-29')
  await card3.getByRole('radio', { name: /一般/ }).click()
  await card3.getByRole('radio', { name: '普通', exact: true }).click()
  await card3.locator('input[placeholder*="极限"]').fill('传输层、网络层')
  await page.locator('input[aria-label="每天可复习小时数"]').fill('3')
}

// 元素截图时避免 sticky 导航叠在元素顶部：导出上下文内导航改为静态定位
const STATIC_HEADER_CSS = '.site-header { position: static !important; }'

// Mobile assets
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: STATIC_HEADER_CSS })
  await page.waitForTimeout(1100)
  await page.screenshot({
    path: path.join(outDir, '01-home-390.png'),
    fullPage: false,
  })

  await page.goto('http://127.0.0.1:5173/#/setup', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: STATIC_HEADER_CSS })
  await fillSetup(page)
  await page.getByRole('button', { name: '生成我的期末诊断' }).click()
  await page.waitForURL('**/#/analysis')
  await page.waitForTimeout(1100)

  await page.locator('.diagnosis-hero').screenshot({
    path: path.join(outDir, '02-diagnosis-hero-390.png'),
  })
  await page.locator('.resource-card').screenshot({
    path: path.join(outDir, '03-time-allocation-390.png'),
  })
  await page.locator('.risk-report-card').first().screenshot({
    path: path.join(outDir, '04-risk-reason-390.png'),
  })
  await page.locator('.matrix-card').screenshot({
    path: path.join(outDir, '05-risk-matrix-390.png'),
  })

  await page.getByRole('button', { name: '生成我的状态卡' }).first().click()
  await page.waitForTimeout(250)
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
  await page.getByRole('button', { name: '保存图片' }).click()
  const download = await downloadPromise
  await download.saveAs(path.join(outDir, '06-share-card.png'))
  await page.getByRole('button', { name: '先看看' }).click()

  await page.getByRole('button', { name: '生成 7 天行动' }).click()
  await page.waitForURL('**/#/plan')
  await page.waitForTimeout(300)
  await page.locator('.plan-overview').screenshot({
    path: path.join(outDir, '07-week-resource-390.png'),
  })
  await page.locator('.day-card.is-today').screenshot({
    path: path.join(outDir, '08-today-plan-390.png'),
  })

  await page.getByRole('radio', { name: /完成一部分/ }).click()
  await page.getByRole('button', { name: /提交反馈并调整后续计划/ }).click()
  await page.waitForTimeout(450)
  await page.locator('.adjustment-card-marketing').screenshot({
    path: path.join(outDir, '09-dynamic-adjustment-390.png'),
  })
  await context.close()
}

// Desktop assets
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: STATIC_HEADER_CSS })
  await page.waitForTimeout(1100)
  await page.screenshot({
    path: path.join(outDir, '10-home-1440.png'),
    fullPage: true,
  })

  await page.goto('http://127.0.0.1:5173/#/setup', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: STATIC_HEADER_CSS })
  await fillSetup(page)
  await page.getByRole('button', { name: '生成我的期末诊断' }).click()
  await page.waitForURL('**/#/analysis')
  await page.waitForTimeout(1100)
  await page.locator('.diagnosis-hero').screenshot({
    path: path.join(outDir, '11-diagnosis-hero-1440.png'),
  })
  await page.getByRole('button', { name: '生成 7 天行动' }).click()
  await page.waitForURL('**/#/plan')
  await page.waitForTimeout(300)
  await page.locator('.plan-overview').screenshot({
    path: path.join(outDir, '12-week-resource-1440.png'),
  })
  await context.close()
}

await browser.close()
console.log(`Marketing assets exported to ${outDir}`)
