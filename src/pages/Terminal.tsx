import { useState } from 'react'
import { ipc } from '../lib/ipc'

export default function Terminal({ code, setCode, example }: { code: string; setCode: (c: string) => void; example: string }) {
  const [out, setOut] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [missing, setMissing] = useState('')

  async function run() {
    setBusy(true); setOut('Running...'); setErr(false); setMissing('')
    const r = await ipc.run(code, 'terminal')
    setBusy(false)
    setErr(!r.ok)
    setMissing(r.missing || '')
    setOut(((r.stdout || '') + (r.stderr ? '\n' + r.stderr : '')) || '(no output)')
  }

  async function installAndRun() {
    const pkg = missing
    setBusy(true); setOut(`Installing ${pkg}...`); setErr(false)
    const ir = await ipc.pipInstall(pkg)
    if (!ir.ok) { setBusy(false); setErr(true); setOut(((ir.stdout || '') + '\n' + (ir.stderr || '')).slice(-1500)); return }
    setMissing('')
    await run()
  }

  return (
    <div className="term">
      <p className="muted">Write or paste any Qiskit program. It runs exactly as written. Switch to Canvas to build a circuit visually, or open Configuration to connect real IBM hardware.</p>
      <textarea className="editor" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      <div className="term-bar">
        <button className="btn good" onClick={run} disabled={busy}>{busy ? 'Running...' : 'Run ▶'}</button>
        <button className="btn soft" onClick={() => setCode(example)}>Reset example</button>
        {missing && <button className="btn" onClick={installAndRun} disabled={busy}>Install {missing} and run again</button>}
      </div>
      <div className={'output' + (err ? ' err' : '')}>{out || 'Output will appear here.'}</div>
    </div>
  )
}
