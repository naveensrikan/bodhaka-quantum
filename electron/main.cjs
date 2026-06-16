const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = !app.isPackaged
let tray = null

// The tray/window icon. Prefers the real logo.png file shipped as an extra resource
// (outside app.asar), which nativeImage can always read.
function logoFile() {
  const candidates = [
    path.join(process.resourcesPath, 'logo.png'),
    path.join(__dirname, '..', 'public', 'logo.png'),
    path.join(__dirname, '..', 'dist', 'logo.png'),
  ]
  for (const p of candidates) { try { if (fs.existsSync(p)) return p } catch {} }
  return null
}

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fb } }
function writeJson(p, o) { try { fs.mkdirSync(path.dirname(p), { recursive: true }) } catch {} ; fs.writeFileSync(p, JSON.stringify(o, null, 2)) }

const userData = () => app.getPath('userData')
const locPath = () => path.join(userData(), 'location.json')        // pointer to the storage dir
const agreePath = () => path.join(userData(), 'agreement.json')     // the legal-notice acceptance

// All user data (config, stats, history, encrypted key) lives in storeDir, which the
// user may relocate. Defaults to the app's userData folder so it always works.
function storeDir() {
  const d = readJson(locPath(), {}).dir
  if (d) { try { fs.mkdirSync(d, { recursive: true }) } catch {} ; if (fs.existsSync(d)) return d }
  return userData()
}
const cfgPath = () => path.join(storeDir(), 'config.json')
const statsPath = () => path.join(storeDir(), 'stats.json')
const histPath = () => path.join(storeDir(), 'history.json')

// runner.py is shipped as an extra resource (NOT inside app.asar) so a real Python
// process can actually open it on every machine, whatever the install directory is.
function runnerScript() {
  return isDev ? path.join(__dirname, 'runner.py') : path.join(process.resourcesPath, 'runner.py')
}

// User-installed packages go here, a folder that is always writable (unlike the app's
// own Python folder, which can be read-only). It is added to PYTHONPATH on every run,
// so `pip install` works for any package, on any machine, including the Store build.
function pkgDir() {
  const d = path.join(app.getPath('userData'), 'pypackages')
  try { fs.mkdirSync(d, { recursive: true }) } catch {}
  return d
}

// Prefer the Python bundled inside the app (so a blank laptop needs nothing installed);
// fall back to a system Python only if the bundle is somehow absent.
function pythonPath() {
  const exe = process.platform === 'win32' ? 'python.exe' : path.join('bin', 'python3')
  const bundled = path.join(process.resourcesPath, 'python', exe)
  if (fs.existsSync(bundled)) return bundled
  return process.platform === 'win32' ? 'py' : 'python3'
}

function encryptToken(token) {
  if (safeStorage.isEncryptionAvailable()) return safeStorage.encryptString(token).toString('base64')
  return Buffer.from(token, 'utf8').toString('base64')
}
function decryptToken(cfg) {
  if (!cfg || !cfg.encToken) return ''
  try {
    const buf = Buffer.from(cfg.encToken, 'base64')
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(buf)
    return buf.toString('utf8')
  } catch { return '' }
}

// Credentials reach Python ONLY through environment variables, decrypted just in time.
// qiskit-ibm-runtime's QiskitRuntimeService() reads these, so user code needs no auth lines.
function ibmEnv() {
  const cfg = readJson(cfgPath(), {})
  const env = { ...process.env }
  // Make user-installed packages importable by every program we run.
  env.PYTHONPATH = pkgDir() + (env.PYTHONPATH ? path.delimiter + env.PYTHONPATH : '')
  if (cfg.tokenSaved) {
    const tok = decryptToken(cfg)
    if (tok) {
      env.QISKIT_IBM_TOKEN = tok
      env.QISKIT_IBM_CHANNEL = 'ibm_quantum_platform'
      if (cfg.instance) env.QISKIT_IBM_INSTANCE = cfg.instance
    }
  }
  return env
}

function runPython(args, { stdin, timeoutMs, env } = {}) {
  return new Promise((resolve) => {
    let proc
    try { proc = spawn(pythonPath(), args, { windowsHide: true, env: env || process.env }) }
    catch (e) { return resolve({ ok: false, stdout: '', stderr: String((e && e.message) || e) }) }
    let out = '', err = '', done = false
    const finish = (r) => { if (done) return; done = true; if (timer) clearTimeout(timer); resolve(r) }
    const timer = timeoutMs ? setTimeout(() => { try { proc.kill() } catch {} ; finish({ ok: false, stdout: out, stderr: err + '\n[timed out]' }) }, timeoutMs) : null
    proc.stdout.on('data', (d) => { out += d.toString() })
    proc.stderr.on('data', (d) => { err += d.toString() })
    proc.on('error', (e) => finish({ ok: false, stdout: '', stderr: 'Python could not start. The bundled environment may be missing.\n' + String((e && e.message) || e) }))
    proc.on('close', (code) => finish({ ok: code === 0, stdout: out, stderr: err }))
    if (stdin != null) { proc.stdin.write(stdin); proc.stdin.end() }
  })
}

// The matplotlib font cache is built at BUILD time and shipped; copy it to a writable
// folder once so matplotlib never rebuilds it at run time.
function mplCacheDir() { return path.join(userData(), 'mplcache') }
function seedMplCache() {
  try {
    const dst = mplCacheDir()
    if (fs.existsSync(dst)) return
    const src = path.join(process.resourcesPath, 'python', 'mplcache')
    if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true })
  } catch {}
}

// A single long-lived Python process keeps Qiskit and matplotlib imported, so runs are
// fast after the first warm-up. One JSON line per request/response.
function workerScript() { return isDev ? path.join(__dirname, 'worker.py') : path.join(process.resourcesPath, 'worker.py') }
let worker = null, workerBuf = '', workerPending = new Map(), workerIdc = 0
function spawnWorker() {
  const env = {
    ...process.env, MPLBACKEND: 'Agg', MPLCONFIGDIR: mplCacheDir(), QSUMMIT_PKGDIR: pkgDir(),
    PYTHONPATH: pkgDir() + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ''),
  }
  try { worker = spawn(pythonPath(), [workerScript()], { windowsHide: true, env }) }
  catch { worker = null; return }
  worker.stdout.on('data', (d) => {
    workerBuf += d.toString()
    let i
    while ((i = workerBuf.indexOf('\n')) >= 0) {
      const line = workerBuf.slice(0, i); workerBuf = workerBuf.slice(i + 1)
      if (!line.trim()) continue
      let msg; try { msg = JSON.parse(line) } catch { continue }
      if (msg.ready) continue
      if (msg.id != null && workerPending.has(msg.id)) { const r = workerPending.get(msg.id); workerPending.delete(msg.id); r(msg) }
    }
  })
  worker.stderr.on('data', () => {})
  worker.on('exit', () => { worker = null; for (const [, r] of workerPending) r({ ok: false, stdout: '', stderr: 'The Python engine stopped. Please try again.' }); workerPending.clear() })
}
function ensureWorker() { if (!worker) spawnWorker() }
function workerRun(code, ibmVars) {
  ensureWorker()
  if (!worker) return Promise.resolve({ ok: false, stdout: '', stderr: 'The Python engine could not start. The bundled environment may be missing.' })
  return new Promise((resolve) => {
    const id = String(++workerIdc)
    workerPending.set(id, resolve)
    try { worker.stdin.write(JSON.stringify({ id, code, env: { ...ibmVars, MPLBACKEND: 'Agg' } }) + '\n') }
    catch { workerPending.delete(id); resolve({ ok: false, stdout: '', stderr: 'Could not reach the Python engine.' }) }
  })
}

function createWindow() {
  const lf = logoFile()
  const win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 960, minHeight: 620,
    backgroundColor: '#DBE7F3',
    title: 'Bodhaka Quantum Summit',
    icon: lf || undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

function createTray() {
  const lf = logoFile()
  if (!lf) return
  try {
    tray = new Tray(nativeImage.createFromPath(lf).resize({ width: 18, height: 18 }))
    tray.setToolTip('Bodhaka Quantum Summit')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show Bodhaka Quantum Summit', click: () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { w.show(); w.focus() } else createWindow() } },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]))
    tray.on('click', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { w.isVisible() ? w.focus() : w.show() } })
  } catch {}
}

app.whenReady().then(() => {
  seedMplCache()
  ensureWorker()   // warm up Python in the background so the first run is fast
  createWindow()
  createTray()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('before-quit', () => { try { if (worker) worker.stdin.write('{"cmd":"quit"}\n') } catch {} })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

ipcMain.handle('config:get', () => {
  const c = readJson(cfgPath(), {})
  return { username: c.username || '', instance: c.instance || '', tokenSaved: !!c.tokenSaved }
})

ipcMain.handle('config:save', async (_e, cfg) => {
  const cur = readJson(cfgPath(), {})
  const stored = { username: cfg.username || '', instance: cfg.instance || '', tokenSaved: !!cur.tokenSaved, encToken: cur.encToken }
  if (cfg.token) { stored.encToken = encryptToken(cfg.token); stored.tokenSaved = true }
  writeJson(cfgPath(), stored)
  let verified = false, error = ''
  if (stored.tokenSaved) {
    const r = await runPython([runnerScript(), 'verify'], { timeoutMs: 30000, env: ibmEnv() })
    if (r.ok) { try { const j = JSON.parse(r.stdout); verified = !j.error; if (j.error) error = String(j.error) } catch { error = 'Unexpected reply from IBM.' } }
    else error = (r.stderr || 'Saved, but could not reach IBM right now.').split('\n').filter(Boolean).slice(-2).join(' ')
  }
  return { ok: true, verified, error, config: { username: stored.username, instance: stored.instance, tokenSaved: stored.tokenSaved } }
})

ipcMain.handle('run', async (_e, { code }) => {
  const cfg = readJson(cfgPath(), {})
  // Choosing IBM hardware without a saved key must fail loudly, not silently run local.
  if (/QiskitRuntimeService/.test(code) && !cfg.tokenSaved) {
    return { ok: false, stdout: '', stderr: 'This program runs on IBM Quantum, but no API key is configured.\nOpen Configuration and save your IBM Quantum API key first.', missing: '' }
  }
  const ibmVars = {}
  if (cfg.tokenSaved) {
    const tok = decryptToken(cfg)
    if (tok) { ibmVars.QISKIT_IBM_TOKEN = tok; ibmVars.QISKIT_IBM_CHANNEL = 'ibm_quantum_platform'; if (cfg.instance) ibmVars.QISKIT_IBM_INSTANCE = cfg.instance }
  }
  const res = await workerRun(code, ibmVars)
  const s = readJson(statsPath(), { programsRun: 0 }); s.programsRun = (s.programsRun || 0) + 1; s.lastRun = new Date().toISOString(); writeJson(statsPath(), s)
  const target = /QiskitRuntimeService/.test(code) ? 'IBM Quantum' : 'Local simulator'
  const title = (code.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('from ') && !l.startsWith('import ')) || 'Program').slice(0, 70)
  const output = ((res.stdout || '') + (res.stderr ? '\n' + res.stderr : '')).slice(0, 6000)
  const h = readJson(histPath(), { items: [] })
  h.items.unshift({ t: new Date().toISOString(), target, ok: res.ok, title, code: String(code).slice(0, 6000), output })
  h.items = h.items.slice(0, 100); writeJson(histPath(), h)
  return res
})

ipcMain.handle('stats:get', async () => {
  const local = readJson(statsPath(), { programsRun: 0 })
  const cfg = readJson(cfgPath(), {})
  let remote = {}
  if (cfg.tokenSaved) {
    const r = await runPython([runnerScript(), 'usage'], { timeoutMs: 30000, env: ibmEnv() })
    if (r.ok) { try { remote = JSON.parse(r.stdout) } catch {} }
  }
  return { local, cfg: { instance: cfg.instance || '', tokenSaved: !!cfg.tokenSaved }, remote }
})

ipcMain.handle('history:get', () => readJson(histPath(), { items: [] }).items)
ipcMain.handle('notice:get', () => readJson(agreePath(), { agreed: false }))
ipcMain.handle('notice:agree', () => { writeJson(agreePath(), { agreed: true, at: new Date().toISOString() }); return { ok: true } })
ipcMain.handle('storage:get', () => ({ dir: storeDir() }))
ipcMain.handle('storage:choose', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Choose where to store your settings and encrypted key' })
  if (r.canceled || !r.filePaths[0]) return { dir: storeDir() }
  writeJson(locPath(), { dir: r.filePaths[0] })
  return { dir: r.filePaths[0] }
})
// Install extra Python packages into the app's bundled Python (it lives in a user
// writable folder for the .exe build). matplotlib + pylatexenc ship by default.
ipcMain.handle('pip:install', async (_e, pkg) => {
  const name = String(pkg || '').trim()
  if (!name || !/^[A-Za-z0-9_.\-\[\]=<>!~ ]+$/.test(name)) return { ok: false, stdout: '', stderr: 'Enter one or more valid package names.' }
  return await runPython(['-m', 'pip', 'install', '--target', pkgDir(), ...name.split(/\s+/)], { timeoutMs: 600000, env: process.env })
})

ipcMain.handle('open-external', (_e, url) => { if (url) shell.openExternal(url) })
