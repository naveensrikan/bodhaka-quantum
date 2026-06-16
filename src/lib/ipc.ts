// Thin wrapper over the preload bridge. Falls back to stubs when run outside Electron.
export type Config = { username: string; instance: string; tokenSaved: boolean; token?: string }
export type RunResult = { ok: boolean; stdout: string; stderr: string; missing?: string }
export type SaveResult = { ok: boolean; verified: boolean; error: string; config: Config }
export type Stats = { local: { programsRun: number; lastRun?: string }; cfg: any; remote: any }
export type HistoryItem = { t: string; target: string; ok: boolean; title: string; code?: string; output?: string }

const w = window as any
const native = w.summit

export const ipc = {
  getConfig: (): Promise<Config> =>
    native ? native.getConfig() : Promise.resolve({ username: '', instance: '', tokenSaved: false }),
  saveConfig: (cfg: Config): Promise<SaveResult> =>
    native ? native.saveConfig(cfg) : Promise.resolve({ ok: true, verified: false, error: '', config: { username: cfg.username, instance: cfg.instance, tokenSaved: !!cfg.token } }),
  run: (code: string, target = 'terminal'): Promise<RunResult> =>
    native ? native.run(code, target) : Promise.resolve({ ok: true, stdout: '[preview] Programs run inside the installed app.\n', stderr: '' }),
  getStats: (): Promise<Stats> =>
    native ? native.getStats() : Promise.resolve({ local: { programsRun: 0 }, cfg: {}, remote: {} }),
  getHistory: (): Promise<HistoryItem[]> =>
    native ? native.getHistory() : Promise.resolve([]),
  getNotice: (): Promise<{ agreed: boolean }> =>
    native ? native.getNotice() : Promise.resolve({ agreed: true }),
  agreeNotice: (): Promise<{ ok: boolean }> =>
    native ? native.agreeNotice() : Promise.resolve({ ok: true }),
  getStorage: (): Promise<{ dir: string }> =>
    native ? native.getStorage() : Promise.resolve({ dir: '(app data folder)' }),
  chooseStorage: (): Promise<{ dir: string }> =>
    native ? native.chooseStorage() : Promise.resolve({ dir: '(app data folder)' }),
  pipInstall: (pkg: string): Promise<RunResult> =>
    native ? native.pipInstall(pkg) : Promise.resolve({ ok: true, stdout: '[preview] pip install runs inside the app.\n', stderr: '' }),
  openExternal: (url: string) => { native ? native.openExternal(url) : window.open(url, '_blank') },
}
