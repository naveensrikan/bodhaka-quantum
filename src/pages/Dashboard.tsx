import { useEffect, useState } from 'react'
import { ipc, Stats } from '../lib/ipc'

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() { setBusy(true); setS(await ipc.getStats()); setBusy(false) }
  useEffect(() => { load() }, [])

  const local: any = s?.local || {}
  const cfg: any = s?.cfg || {}
  const remote: any = s?.remote || {}
  const usage: any = remote.usage
  const dash = (v: any) => (v === undefined || v === null || v === '') ? '—' : String(v)

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <button className="btn soft" onClick={load} disabled={busy}>{busy ? '...' : 'Refresh'}</button>
      </div>
      <div className="cards">
        <div className="stat"><div className="n">{dash(local.programsRun ?? 0)}</div><div className="l">Programs run</div></div>
        <div className="stat"><div className="n">{dash(remote.jobs)}</div><div className="l">Jobs on IBM</div></div>
        <div className="stat"><div className="n">{dash(usage ? (usage.minutes_remaining ?? usage.remaining) : undefined)}</div><div className="l">Free time remaining</div></div>
        <div className="stat"><div className="n">{dash(cfg.crn ? 'IBM Cloud' : (cfg.instance || (cfg.tokenSaved ? 'Open plan' : undefined)))}</div><div className="l">Plan / instance</div></div>
        <div className="stat"><div className="n">{dash(usage ? usage.cost : undefined)}</div><div className="l">Cost incurred</div></div>
      </div>
      {!cfg.tokenSaved && (
        <div className="note warn">Connect your IBM Quantum account in Configuration to see live jobs, remaining free time, and cost.</div>
      )}
      {cfg.tokenSaved && (remote.usage_error || remote.error) && (
        <p className="muted">Some live figures are not exposed by your plan right now. Programs run is always tracked locally on this computer.</p>
      )}
    </div>
  )
}
