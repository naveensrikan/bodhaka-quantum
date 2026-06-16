import { useEffect, useState } from 'react'
import { ipc, Config } from '../lib/ipc'

export default function Configuration() {
  const [cfg, setCfg] = useState<Config>({ username: '', instance: '', crn: '', tokenSaved: false })
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<{ kind: string; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { ipc.getConfig().then(setCfg) }, [])

  async function save() {
    setBusy(true); setStatus(null)
    const r = await ipc.saveConfig({ ...cfg, token: token || undefined })
    setBusy(false)
    if (r.ok) {
      setCfg(r.config); setToken('')
      setStatus({ kind: 'ok', msg: token ? 'Saved. Your IBM account is configured on this computer.' : 'Saved.' })
    } else {
      setStatus({ kind: 'bad', msg: r.error || 'Could not save.' })
    }
  }

  return (
    <div>
      <div className="page-head"><h1>Configuration</h1></div>
      <p className="lead">Enter your details once. Everything is stored on this computer only and is never sent to Bodhaka. You can get a free API key at quantum.ibm.com.</p>
      <div className="fields">
        <div className="field">
          <label>Your name</label>
          <input value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} placeholder="e.g. Asha" />
        </div>
        <div className="field">
          <label>IBM Quantum API key</label>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder={cfg.tokenSaved ? 'Saved. Paste a new key to replace it.' : 'Paste your IBM Quantum API key'} />
          <div className="hint">From your dashboard at quantum.ibm.com. <span className="link" onClick={() => ipc.openExternal('https://quantum.ibm.com')}>Open portal</span></div>
        </div>
        <div className="field">
          <label>Instance (optional)</label>
          <input value={cfg.instance} onChange={(e) => setCfg({ ...cfg, instance: e.target.value })} placeholder="e.g. ibm-q/open/main" />
        </div>
        <div className="field">
          <label>CRN (optional, for IBM Cloud accounts)</label>
          <input value={cfg.crn} onChange={(e) => setCfg({ ...cfg, crn: e.target.value })} placeholder="crn:v1:bluemix:..." />
        </div>
        <div className="row">
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save & connect'}</button>
          {cfg.tokenSaved && <span className="statusline ok">Account connected ✓</span>}
        </div>
        {status && <div className={'statusline ' + status.kind}>{status.msg}</div>}
      </div>
    </div>
  )
}
