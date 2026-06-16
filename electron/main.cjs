const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = !app.isPackaged
const cfgPath = () => path.join(app.getPath('userData'), 'config.json')
const statsPath = () => path.join(app.getPath('userData'), 'stats.json')

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)) }

// Prefer the Python we bundle inside the app (resources/python); fall back to a
// system Python so the app still runs if the bundle is missing.
function pythonPath() {
  const exe = process.platform === 'win32' ? 'python.exe' : path.join('bin', 'python3')
  const bundled = path.join(process.resourcesPath, 'python', exe)
  if (fs.existsSync(bundled)) return bundled
  return process.platform === 'win32' ? 'py' : 'python3'
}

function runPython(args, stdinStr) {
  return new Promise((resolve) => {
    let proc
    try { proc = spawn(pythonPath(), args, { windowsHide: true }) }
    catch (e) { return resolve({ ok: false, stdout: '', stderr: String((e && e.message) || e) }) }
    let out = '', err = ''
    proc.stdout.on('data', (d) => { out += d.toString() })
    proc.stderr.on('data', (d) => { err += d.toString() })
    proc.on('error', (e) => resolve({ ok: false, stdout: '', stderr: 'Python was not found. Open Configuration and set up your environment.\n' + String((e && e.message) || e) }))
    proc.on('close', (code) => resolve({ ok: code === 0, stdout: out, stderr: err }))
    if (stdinStr != null) { proc.stdin.write(stdinStr); proc.stdin.end() }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 760, minWidth: 940, minHeight: 600,
    backgroundColor: '#DBE7F3',
    title: 'Bodhaka Quantum Summit',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

ipcMain.handle('config:get', () => readJson(cfgPath(), { username: '', instance: '', crn: '', tokenSaved: false }))

ipcMain.handle('config:save', async (_e, cfg) => {
  const token = (cfg && cfg.token) || ''
  const stored = {
    username: (cfg && cfg.username) || '',
    instance: (cfg && cfg.instance) || '',
    crn: (cfg && cfg.crn) || '',
    tokenSaved: !!(cfg && cfg.tokenSaved),
  }
  let acct = { ok: true, stderr: '' }
  if (token) {
    acct = await runPython([path.join(__dirname, 'runner.py'), 'save-account'],
      JSON.stringify({ token, instance: stored.instance, crn: stored.crn }))
    stored.tokenSaved = acct.ok
  }
  writeJson(cfgPath(), stored)
  return { ok: acct.ok, error: acct.ok ? '' : (acct.stderr || 'Could not save the account.'), config: stored }
})

ipcMain.handle('run', async (_e, { code }) => {
  const file = path.join(app.getPath('temp'), `summit_${Date.now()}.py`)
  fs.writeFileSync(file, code, 'utf8')
  const res = await runPython([file])
  try { fs.unlinkSync(file) } catch {}
  const s = readJson(statsPath(), { programsRun: 0 })
  s.programsRun = (s.programsRun || 0) + 1
  s.lastRun = new Date().toISOString()
  writeJson(statsPath(), s)
  return res
})

ipcMain.handle('stats:get', async () => {
  const local = readJson(statsPath(), { programsRun: 0 })
  const cfg = readJson(cfgPath(), {})
  let remote = {}
  if (cfg.tokenSaved) {
    const r = await runPython([path.join(__dirname, 'runner.py'), 'usage'])
    if (r.ok) { try { remote = JSON.parse(r.stdout) } catch {} }
  }
  return { local, cfg, remote }
})

ipcMain.handle('open-external', (_e, url) => { if (url) shell.openExternal(url) })
