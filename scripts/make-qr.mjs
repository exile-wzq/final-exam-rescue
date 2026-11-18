import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const [url, out] = process.argv.slice(2)
if (!url || !out) {
  console.error('用法：node scripts/make-qr.mjs <url> <输出文件名.png>')
  process.exit(1)
}

const target = path.join(root, 'marketing-assets', out)
await QRCode.toFile(target, url, {
  type: 'png',
  width: 1080,
  margin: 4,
  errorCorrectionLevel: 'Q',
  color: { dark: '#11251d', light: '#f3efe5' },
})
console.log(target)