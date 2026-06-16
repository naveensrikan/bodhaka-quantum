import { useEffect, useState } from 'react'
import { ipc, Config } from '../lib/ipc'

export default function Configuration({ onShowNotice }: { onShowNotice: () => void }) {
  const [cfg, setCfg] = useState<Config>({ username: '', instance: '', tokenSaved: false })
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<{ kind: string; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [dir, setDir] = useState('')

  useEffect(() => { ipc.getConfig().then(setCfg); ipc.getStorage().then((s) => setDir(s.dir)) }, [])

  async function save() {
    setBusy(true); setStatus(null)
    const r = await ipc.saveConfig({ ...cfg, token: token || undefined })
    setBusy(false)
    setCfg(r.config); setToken('')
    if (r.verified) setStatus({ kind: 'ok', msg: 'Saved and connected to IBM Quantum.' })
    else if (r.config.tokenSaved) setStatus({ kind: r.error ? 'bad' : 'ok', msg: r.error ? 'Saved. ' + r.error : 'Saved.' })
    else setStatus({ kind: 'ok', msg: 'Saved.' })
  }

  async function choose() { const s = await ipc.chooseStorage(); setDir(s.dir) }

  return (
    <div>
      <div className="page-head">
        <h1>Configuration</h1>
        <button className="btn soft" onClick={onShowNotice}>View notice</button>
      </div>
      <p className="lead">Enter your details once. Your API key is encrypted on this computer and is never sent to Bodhaka. You can get a free key at quantum.ibm.com.</p>
      <div className="fields">
        <div className="field">
          <label>Your name</label>
          <input value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} placeholder="e.g. Asha" />
        </div>
        <div className="field">
          <label>IBM Quantum API key</label>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder={cfg.tokenSaved ? 'Saved and encrypted. Paste a new key to replace it.' : 'Paste your IBM Quantum API key'} />
          <div className="hint">From your dashboard at quantum.ibm.com. <span className="link" onClick={() => ipc.openExternal('https://quantum.ibm.com')}>Open portal</span></div>
        </div>
        <div className="field">
          <label>Instance / CRN (optional)</label>
          <input value={cfg.instance} onChange={(e) => setCfg({ ...cfg, instance: e.target.value })} placeholder="crn:v2:..." />
          <div className="hint">This is the value Qiskit calls "instance". Leave blank to use your account default.</div>
        </div>
        <div className="field">
          <label>Storage location</label>
          <div className="row">
            <input value={dir} readOnly style={{ flex: 1 }} />
            <button className="btn soft" onClick={choose}>Change folder</button>
          </div>
          <div className="hint">Where your settings and encrypted key are stored on this computer.</div>
        </div>
        <div className="row">
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save & connect'}</button>
          {cfg.tokenSaved && <span className="statusline ok">Key saved (encrypted) ✓</span>}
        </div>
        {status && <div className={'statusline ' + status.kind}>{status.msg}</div>}
      </div>
    </div>
  )
}
