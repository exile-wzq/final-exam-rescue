import { spawn, execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const sessionFile = path.join(root, 'scripts', '.live-session.json')
const cloudflaredExe = path.join(root, 'scripts', 'bin', 'cloudflared.exe')
const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1]) || 4173

function killTree(pid) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
  } catch {
    // 进程可能已退出
  }
}

async function stop() {
  try {
    const session = JSON.parse(await fs.readFile(sessionFile, 'utf8'))
    for (const pid of session.pids ?? []) killTree(pid)
    await fs.unlink(sessionFile)
    console.log(`已停止演示服务与隧道（原链接 ${session.url} 随之失效）。`)
  } catch {
    console.log('没有正在运行的演示会话。')
  }
}

if (args.includes('--stop')) {
  await stop()
  process.exit(0)
}

const children = []
function cleanup(code = 0) {
  for (const child of children) killTree(child.pid)
  process.exit(code)
}
process.on('SIGINT', () => cleanup(0))
process.on('SIGTERM', () => cleanup(0))

// 1. 产物：默认复用 dist，--build 或 dist 缺失时重新构建
const distIndex = path.join(root, 'dist', 'index.html')
const hasDist = await fs
  .access(distIndex)
  .then(() => true)
  .catch(() => false)
if (args.includes('--build') || !hasDist) {
  console.log('构建生产产物…')
  execSync('npm run build', { cwd: root, stdio: 'inherit' })
}

// 2. 本地生产预览服务
const preview = spawn(
  process.execPath,
  [
    path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  { cwd: root },
)
children.push(preview)
preview.on('exit', (code) => {
  console.error('本地预览服务退出，演示链接失效。')
  cleanup(code ?? 1)
})

const localUrl = `http://127.0.0.1:${port}/`
async function waitLocal() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(localUrl)
      if (res.ok) return
    } catch {
      // 服务尚未就绪
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('本地预览服务启动超时。')
}
await waitLocal()
console.log(`本地预览就绪：${localUrl}`)

// 3. cloudflared 临时隧道（免注册；http2 以兼容代理环境）
const tunnel = spawn(
  cloudflaredExe,
  [
    'tunnel',
    '--url',
    `http://127.0.0.1:${port}`,
    '--no-autoupdate',
    '--protocol',
    'http2',
  ],
  { cwd: root },
)
children.push(tunnel)
tunnel.on('exit', (code) => {
  console.error('隧道进程退出，公网链接失效。重跑本脚本可生成新链接与新二维码。')
  cleanup(code ?? 1)
})

const publicUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error('60 秒内未拿到隧道地址，检查网络或代理设置。')),
    60000,
  )
  const scan = (chunk) => {
    const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (match) {
      clearTimeout(timer)
      resolve(match[0])
    }
  }
  tunnel.stdout.on('data', scan)
  tunnel.stderr.on('data', scan)
})
console.log(`公网链接：${publicUrl}`)

// 4. 验证公网可达
let reachable = false
for (let i = 0; i < 8; i += 1) {
  try {
    const res = await fetch(publicUrl, { redirect: 'follow' })
    if (res.ok) {
      reachable = true
      break
    }
  } catch {
    // 隧道传播中
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))
}
if (!reachable) {
  console.error('警告：公网链接暂未验证通过，二维码仍已生成，请稍后用手机实测。')
}

// 5. 品牌色二维码 + 链接文本
const qrPath = path.join(root, 'marketing-assets', 'qr-live.png')
await QRCode.toFile(qrPath, publicUrl, {
  type: 'png',
  width: 1080,
  margin: 4,
  errorCorrectionLevel: 'Q',
  color: { dark: '#11251d', light: '#f3efe5' },
})
await fs.writeFile(
  path.join(root, 'marketing-assets', 'live-url.txt'),
  `${publicUrl}\n生成时间：${new Date().toLocaleString('zh-CN')}\n`,
  'utf8',
)
await fs.writeFile(
  sessionFile,
  JSON.stringify(
    { pids: children.map((child) => child.pid), url: publicUrl, port },
    null,
    2,
  ),
  'utf8',
)

console.log('')
console.log(`二维码已生成：${qrPath}`)
console.log('保持本进程运行，链接才有效；微信扫码关注即可打开产品。')
console.log('停止演示：Ctrl+C，或另开终端运行 npm run share:stop')