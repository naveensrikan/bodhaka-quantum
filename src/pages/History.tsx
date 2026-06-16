import { useEffect, useState } from 'react'
import { ipc, HistoryItem } from '../lib/ipc'

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState<HistoryItem | null>(null)

  async function load() { setBusy(true); setItems(await ipc.getHistory()); setBusy(false) }
  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="page-head">
        <h1>History</h1>
        <button className="btn soft" onClick={load} disabled={busy}>{busy ? '...' : 'Refresh'}</button>
      </div>
      {items.length === 0 ? (
        <p className="muted">No programs run yet. Build and run something, and it will appear here. Click any run to see its output.</p>
      ) : (
        <div className="hist">
          {items.map((it, i) => (
            <button key={i} className="hist-row" onClick={() => setSel(it)}>
              <span className={'dot ' + (it.ok ? 'ok' : 'bad')} />
              <span className="hist-title">{it.title}</span>
              <span className={'badge ' + (it.target === 'IBM Quantum' ? 'ibm' : 'local')}>{it.target}</span>
              <span className="hist-time">{new Date(it.t).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="modal-overlay" onClick={() => setSel(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" onClick={() => setSel(null)} aria-label="Close">×</button>
            <h2 style={{ marginBottom: 4 }}>{sel.title}</h2>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <span className={'badge ' + (sel.target === 'IBM Quantum' ? 'ibm' : 'local')}>{sel.target}</span>
              <span className={'badge ' + (sel.ok ? 'local' : 'ibm')} style={{ background: sel.ok ? 'var(--good-bg)' : '#fbe6e3', color: sel.ok ? 'var(--good)' : 'var(--bad)' }}>{sel.ok ? 'Success' : 'Error'}</span>
              <span className="hist-time">{new Date(sel.t).toLocaleString()}</span>
            </div>
            <div className="muted" style={{ fontSize: '.78rem', marginBottom: 6 }}>Program</div>
            <div className="codeview" style={{ maxHeight: 220 }}>{sel.code || '(not stored)'}</div>
            <div className="muted" style={{ fontSize: '.78rem', margin: '12px 0 6px' }}>Output</div>
            <div className="output" style={{ maxHeight: 220, overflow: 'auto' }}>{sel.output || '(no output)'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
