// Thin wrapper over the preload bridge. When running outside Electron (e.g. a plain
// browser preview), it falls back to stubs so the UI still renders.
export type Config = { username: string; instance: string; crn: string; tokenSaved: boolean; token?: string }
export type RunResult = { ok: boolean; stdout: string; stderr: string }
export type Stats = { local: { programsRun: number; lastRun?: string }; cfg: any; remote: any }

const w = window as any
const native = w.summit

export const ipc = {
  getConfig: (): Promise<Config> =>
    native ? native.getConfig() : Promise.resolve({ username: '', instance: '', crn: '', tokenSaved: false }),
  saveConfig: (cfg: Config): Promise<{ ok: boolean; error: string; config: Config }> =>
    native ? native.saveConfig(cfg) : Promise.resolve({ ok: true, error: '', config: { ...cfg, tokenSaved: !!cfg.token } }),
  run: (code: string, target: string): Promise<RunResult> =>
    native ? native.run(code, target) : Promise.resolve({ ok: true, stdout: `[preview] Code would run on: ${target}. Running happens inside the installed app.\n`, stderr: '' }),
  getStats: (): Promise<Stats> =>
    native ? native.getStats() : Promise.resolve({ local: { programsRun: 0 }, cfg: {}, remote: {} }),
  openExternal: (url: string) => { native ? native.openExternal(url) : window.open(url, '_blank') },
}
