import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs/promises'

const outDir = path.resolve('screenshots')
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})

const widthArg = Number(process.argv[2])
const width = Number.isFinite(widthArg) && widthArg >= 320
  ? widthArg
  : process.argv[2] === 'mobile'
    ? 390
    : 1440
const isMobile = width < 700
const viewport = { width, height: isMobile ? 844 : 1050 }

const page = await browser.newPage({
  viewport,
  deviceScaleFactor: 1,
  isMobile,
  hasTouch: isMobile,
})

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
const metrics = await page.evaluate(() => {
  const shell = document.querySelector('.shell')
  const hero = document.querySelector('.hero')
  return {
    viewport: window.innerWidth,
    shellRect: shell?.getBoundingClientRect().toJSON(),
    heroRect: hero?.getBoundingClientRect().toJSON(),
    bodyScrollWidth: document.body.scrollWidth,
    docScrollWidth: document.documentElement.scrollWidth,
  }
})
console.log(JSON.stringify(metrics, null, 2))
await page.screenshot({ path: path.join(outDir, `home-${process.argv[2] ?? 'desktop'}.png`), fullPage: true })
await browser.close()
