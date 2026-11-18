import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const url =
  process.argv[2] ??
  (
    await fs.readFile(path.join(root, 'marketing-assets', 'live-url.txt'), 'utf8')
  )
    .split('\n')[0]
    .trim()
const shotName = url.includes('github.io')
  ? 'pages-wechat-390.png'
  : 'live-wechat-390.png'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003123) NetType/WIFI Language/zh_CN',
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(error.message))

const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(1200)
await page.screenshot({
  path: path.join(root, 'screenshots', shotName),
  fullPage: false,
})

console.log(JSON.stringify({ url, status: response?.status(), errors }, null, 2))
await browser.close()