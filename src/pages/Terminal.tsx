import { useState } from 'react'
import { ipc } from '../lib/ipc'

export default function Terminal({ code, setCode, example }: { code: string; setCode: (c: string) => void; example: string }) {
  const [out, setOut] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true); setOut('Running...'); setErr(false)
    const r = await ipc.run(code, 'terminal')
    setBusy(false)
    setErr(!r.ok)
    setOut(((r.stdout || '') + (r.stderr ? '\n' + r.stderr : '')) || '(no output)')
  }

  return (
    <div className="term">
      <p className="muted">Write or paste any Qiskit program. It runs exactly as written. Switch to Canvas to build a circuit visually, or open Configuration to connect real IBM hardware.</p>
      <textarea className="editor" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      <div className="term-bar">
        <button className="btn good" onClick={run} disabled={busy}>{busy ? 'Running...' : 'Run ▶'}</button>
        <button className="btn soft" onClick={() => setCode(example)}>Reset example</button>
      </div>
      <div className={'output' + (err ? ' err' : '')}>{out || 'Output will appear here.'}</div>
    </div>
  )
}
