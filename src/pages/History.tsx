import { useEffect, useState } from 'react'
import { ipc, HistoryItem } from '../lib/ipc'

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [busy, setBusy] = useState(false)

  async function load() { setBusy(true); setItems(await ipc.getHistory()); setBusy(false) }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-head">
        <h1>History</h1>
        <button className="btn soft" onClick={load} disabled={busy}>{busy ? '...' : 'Refresh'}</button>
      </div>
      {items.length === 0 ? (
        <p className="muted">No programs run yet. Build and run something, and it will appear here with a badge showing where it ran.</p>
      ) : (
        <div className="hist">
          {items.map((it, i) => (
            <div key={i} className="hist-row">
              <span className={'dot ' + (it.ok ? 'ok' : 'bad')} />
              <span className="hist-title">{it.title}</span>
              <span className={'badge ' + (it.target === 'IBM Quantum' ? 'ibm' : 'local')}>{it.target}</span>
              <span className="hist-time">{new Date(it.t).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
