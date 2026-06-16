const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = !app.isPackaged

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

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 960, minHeight: 620,
    backgroundColor: '#DBE7F3',
    title: 'Bodhaka Quantum Summit',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
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
  const file = path.join(app.getPath('temp'), `summit_${Date.now()}.py`)
  fs.writeFileSync(file, code, 'utf8')
  const res = await runPython([file], { env: ibmEnv() })
  try { fs.unlinkSync(file) } catch {}
  const s = readJson(statsPath(), { programsRun: 0 }); s.programsRun = (s.programsRun || 0) + 1; s.lastRun = new Date().toISOString(); writeJson(statsPath(), s)
  const target = /QiskitRuntimeService/.test(code) ? 'IBM Quantum' : 'Local simulator'
  const title = (code.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('from ') && !l.startsWith('import ')) || 'Program').slice(0, 70)
  const h = readJson(histPath(), { items: [] }); h.items.unshift({ t: new Date().toISOString(), target, ok: res.ok, title }); h.items = h.items.slice(0, 200); writeJson(histPath(), h)
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
ipcMain.handle('open-external', (_e, url) => { if (url) shell.openExternal(url) })
