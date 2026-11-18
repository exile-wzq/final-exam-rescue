import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs/promises'

const outDir = path.resolve('screenshots')
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(error.message))

await page.goto('http://127.0.0.1:5173/#/setup', { waitUntil: 'networkidle' })
await page.screenshot({ path: path.join(outDir, 'setup-desktop.png'), fullPage: true })

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

await page.getByRole('button', { name: '生成我的期末诊断' }).click()
await page.waitForURL('**/#/analysis')
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(outDir, 'analysis-desktop.png'), fullPage: true })

await page.getByRole('button', { name: '生成我的状态卡' }).first().click()
await page.waitForTimeout(350)
await page.screenshot({ path: path.join(outDir, 'share-card-desktop.png'), fullPage: false })
await page.getByRole('button', { name: '先看看' }).click()

await page.getByRole('button', { name: '生成 7 天行动' }).click()
await page.waitForURL('**/#/plan')
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(outDir, 'plan-desktop.png'), fullPage: true })

await page.getByRole('radio', { name: /完成一部分/ }).click()
await page.getByRole('button', { name: /提交反馈并调整后续计划/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(outDir, 'plan-adjusted-desktop.png'), fullPage: true })

const layout = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
  shellWidth: document.querySelector('.page')?.getBoundingClientRect().width,
  adjustmentVisible: Boolean(document.querySelector('.adjustment-card-marketing')),
}))

console.log(JSON.stringify({ layout, errors }, null, 2))
await browser.close()
