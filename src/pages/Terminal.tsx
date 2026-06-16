import { useState } from 'react'
import { ipc } from '../lib/ipc'
import { LOCAL_EXAMPLE, IBM_EXAMPLE } from '../lib/examples'

export default function Terminal({ code, setCode }: { code: string; setCode: (c: string) => void }) {
  const [target, setTarget] = useState<'local' | 'ibm'>('local')
  const [out, setOut] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [missing, setMissing] = useState('')
  const [images, setImages] = useState<string[]>([])

  function switchTarget(t: 'local' | 'ibm') {
    setTarget(t)
    setCode(t === 'ibm' ? IBM_EXAMPLE : LOCAL_EXAMPLE)
  }

  async function run() {
    setBusy(true); setOut('Running...'); setErr(false); setMissing(''); setImages([])
    const r = await ipc.run(code, target)
    setBusy(false)
    setErr(!r.ok)
    setMissing(r.missing || '')
    setImages(r.images || [])
    const text = (r.stdout || '') + (r.stderr ? '\n' + r.stderr : '')
    setOut(text || (r.images && r.images.length ? '(figure below)' : '(no output)'))
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
      <div className="term-head">
        <p className="muted" style={{ margin: 0, flex: 1 }}>Write or paste any Qiskit program. Choose where it runs, then press Run.</p>
        <div className="seg" data-mode={target === 'local' ? 'terminal' : 'canvas'}>
          <button className={target === 'local' ? 'on' : ''} onClick={() => switchTarget('local')}>Local simulator</button>
          <button className={target === 'ibm' ? 'on' : ''} onClick={() => switchTarget('ibm')}>IBM Quantum</button>
          <span className="seg-knob" />
        </div>
      </div>
      <textarea className="editor" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      <div className="term-bar">
        <button className="btn good" onClick={run} disabled={busy}>{busy ? 'Running...' : (target === 'ibm' ? 'Run on IBM Quantum ▶' : 'Run on simulator ▶')}</button>
        <button className="btn soft" onClick={() => setCode(target === 'ibm' ? IBM_EXAMPLE : LOCAL_EXAMPLE)}>Reset example</button>
        {missing && <button className="btn" onClick={installAndRun} disabled={busy}>Install {missing} and run again</button>}
      </div>
      <div className={'output' + (err ? ' err' : '')}>{out || 'Output will appear here.'}</div>
      {images.map((b, i) => <img key={i} className="run-img" src={`data:image/png;base64,${b}`} alt="figure" />)}
    </div>
  )
}
