import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs/promises'

const outDir = path.resolve('screenshots')
await fs.mkdir(outDir, { recursive: true })

const width = Number(process.argv[2] ?? 390)
const suffix = width === 390 ? '' : `-${width}`

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width, height: 844 },
  deviceScaleFactor: 1,
  isMobile: width < 600,
  hasTouch: width < 600,
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(error.message))

await page.goto('http://127.0.0.1:5173/#/setup', { waitUntil: 'networkidle' })
await page.screenshot({ path: path.join(outDir, `setup-mobile${suffix}.png`), fullPage: true })

await page.getByRole('button', { name: '生成我的期末诊断' }).click()
const validation = {
  blocked: page.url().endsWith('/#/setup'),
  errorCount: await page.locator('.field-error, .form-error').count(),
  firstError: await page.locator('.field-error, .form-error').first().textContent(),
}

// Fill in a realistic set of exams through the actual UI.
const examCards = page.locator('.exam-editor')
await examCards.nth(0).locator('input[type="text"]').first().fill('高等数学')
await examCards.nth(0).locator('input[type="date"]').fill('2026-11-21')
await examCards.nth(0).getByRole('radio', { name: /完全不会|不会/ }).click()
await examCards.nth(0).getByRole('radio', { name: '非常重要' }).click()
await examCards.nth(0).locator('input[placeholder*="极限"]').fill('极限、级数、微分方程')

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

const daily = page.locator('input[aria-label="每天可复习小时数"]')
await daily.fill('3')
await page.screenshot({ path: path.join(outDir, `setup-filled-mobile${suffix}.png`), fullPage: true })

await page.getByRole('button', { name: '生成我的期末诊断' }).click()
await page.waitForURL('**/#/analysis')
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(outDir, `analysis-mobile${suffix}.png`), fullPage: true })

await page.getByRole('button', { name: '生成我的状态卡' }).first().click()
await page.waitForTimeout(300)
const shareModalVisible = await page.locator('.share-card').isVisible()
await page.screenshot({ path: path.join(outDir, `share-card-mobile${suffix}.png`), fullPage: false })
const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null)
await page.getByRole('button', { name: '保存图片' }).click()
const download = await downloadPromise
if (download) {
  await download.saveAs(path.join(outDir, `share-card-export${suffix}.png`))
}
await page.getByRole('button', { name: '先看看' }).click()

await page.getByRole('button', { name: '生成 7 天行动' }).click()
await page.waitForURL('**/#/plan')
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(outDir, `plan-mobile${suffix}.png`), fullPage: true })

// Record the day totals before feedback so the invariant can be checked.
const before = await page.evaluate(() => {
  const days = [...document.querySelectorAll('.day-card')].map((card) => ({
    date: card.querySelector('.day-month')?.textContent?.trim(),
    load: card.querySelector('.day-load > span')?.textContent?.trim(),
  }))
  return { days, scrollWidth: document.documentElement.scrollWidth }
})

const partial = page.getByRole('radio', { name: /完成一部分/ })
await partial.click()
await page.getByRole('button', { name: /提交反馈并调整后续计划/ }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(outDir, `plan-adjusted-mobile${suffix}.png`), fullPage: true })

const after = await page.evaluate(() => {
  const adjustment = document.querySelector('.adjustment-summary')?.textContent?.trim()
  const days = [...document.querySelectorAll('.day-card')].map((card) => ({
    date: card.querySelector('.day-month')?.textContent?.trim(),
    load: card.querySelector('.day-load > span')?.textContent?.trim(),
  }))
  return { adjustment, days, scrollWidth: document.documentElement.scrollWidth }
})

await page.reload({ waitUntil: 'networkidle' })
const persisted = await page.evaluate(() => ({
  adjustmentVisible: Boolean(document.querySelector('.adjustment-summary')),
  feedbackVisible: Boolean(document.querySelector('.feedback-recorded')),
  load: document.querySelector('.day-load > span')?.textContent?.trim(),
  scrollWidth: document.documentElement.scrollWidth,
}))

console.log(
  JSON.stringify(
    {
      validation,
      share: { modalVisible: shareModalVisible, downloadSaved: Boolean(download) },
      before,
      after,
      persisted,
      errors,
    },
    null,
    2,
  ),
)
await browser.close()
