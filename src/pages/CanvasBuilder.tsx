import { useMemo, useRef, useState } from 'react'
import { ipc } from '../lib/ipc'
import { Circuit, Op, Target, ONE_Q, PARAM_Q, TWO_Q, toQiskit } from '../lib/codegen'

const label = (g: string) => g.toUpperCase()

export default function CanvasBuilder({ onSend }: { onSend: (code: string) => void }) {
  const [n, setN] = useState(2)
  const [ops, setOps] = useState<Op[]>([])
  const [measureAll, setMeasureAll] = useState(true)
  const [target, setTarget] = useState<Target>('local')
  const [over, setOver] = useState<number | null>(null)
  const [out, setOut] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const idRef = useRef(1)
  const [tg, setTg] = useState('cx')
  const [ctrl, setCtrl] = useState(0)
  const [tgt, setTgt] = useState(1)

  const circuit: Circuit = { n, ops, measureAll }
  const code = useMemo(() => toQiskit(circuit, target), [n, ops, measureAll, target])

  function addOp(gate: string, qubits: number[]) {
    setOps((o) => [...o, { id: idRef.current++, gate, qubits, param: PARAM_Q.includes(gate) ? 1.5708 : undefined }])
  }
  const removeOp = (id: number) => setOps((o) => o.filter((x) => x.id !== id))
  const setParam = (id: number, v: number) => setOps((o) => o.map((x) => (x.id === id ? { ...x, param: v } : x)))
  function changeN(nv: number) {
    setN(nv)
    setOps((o) => o.filter((op) => op.qubits.every((q) => q < nv)))
    if (ctrl >= nv) setCtrl(0)
    if (tgt >= nv) setTgt(Math.max(0, nv - 1))
  }

  async function runChosen() {
    setBusy(true); setOut('Running...'); setErr(false)
    const r = await ipc.run(toQiskit(circuit, target), target)
    setBusy(false); setErr(!r.ok)
    setOut(((r.stdout || '') + (r.stderr ? '\n' + r.stderr : '')) || '(no output)')
  }

  return (
    <div className="cv">
      <div>
        <p className="muted">Drag a gate onto a qubit wire. Add two-qubit gates below. Everything becomes real Qiskit on the right.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="muted">Qubits</label>
          <select value={n} onChange={(e) => changeN(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="palette">
          {[...ONE_Q, ...PARAM_Q].map((g) => (
            <div key={g} className={'chip' + (PARAM_Q.includes(g) ? ' p' : '')} draggable
              onDragStart={(e) => e.dataTransfer.setData('gate', g)}>{label(g)}</div>
          ))}
        </div>
        <div className="wires">
          {Array.from({ length: n }).map((_, q) => (
            <div key={q} className={'wire' + (over === q ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setOver(q) }}
              onDragLeave={() => setOver((o) => (o === q ? null : o))}
              onDrop={(e) => { e.preventDefault(); const g = e.dataTransfer.getData('gate'); if (g) addOp(g, [q]); setOver(null) }}>
              <span className="wire-label">q{q}</span>
              {ops.filter((op) => op.qubits[0] === q && !TWO_Q.includes(op.gate)).map((op) => (
                <span key={op.id} className="gate-box">
                  {label(op.gate)}{op.param !== undefined ? `(${Number(op.param.toFixed(2))})` : ''}
                  <button onClick={() => removeOp(op.id)}>×</button>
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="mini-form">
          <span className="muted">Two-qubit</span>
          <select value={tg} onChange={(e) => setTg(e.target.value)}>{TWO_Q.map((g) => <option key={g} value={g}>{label(g)}</option>)}</select>
          <span className="muted">control</span>
          <select value={ctrl} onChange={(e) => setCtrl(Number(e.target.value))}>{Array.from({ length: n }).map((_, q) => <option key={q} value={q}>q{q}</option>)}</select>
          <span className="muted">target</span>
          <select value={tgt} onChange={(e) => setTgt(Number(e.target.value))}>{Array.from({ length: n }).map((_, q) => <option key={q} value={q}>q{q}</option>)}</select>
          <button className="btn soft" onClick={() => addOp(tg, [ctrl, tgt])} disabled={ctrl === tgt}>Add</button>
        </div>
        {ops.some((op) => TWO_Q.includes(op.gate)) && (
          <div className="steps">
            {ops.filter((op) => TWO_Q.includes(op.gate)).map((op) => (
              <div key={op.id} className="step">
                <span className="gate-box">{label(op.gate)} q{op.qubits[0]}, q{op.qubits[1]}<button onClick={() => removeOp(op.id)}>×</button></span>
              </div>
            ))}
          </div>
        )}
        {ops.some((op) => PARAM_Q.includes(op.gate)) && (
          <div className="steps">
            <div className="muted" style={{ fontSize: '.78rem' }}>Rotation angles (radians)</div>
            {ops.filter((op) => PARAM_Q.includes(op.gate)).map((op) => (
              <div key={op.id} className="step">{label(op.gate)} on q{op.qubits[0]}
                <input type="number" step="0.0785" value={op.param} onChange={(e) => setParam(op.id, Number(e.target.value))} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={measureAll} onChange={(e) => setMeasureAll(e.target.checked)} /> measure_all</label>
          <span className="link" onClick={() => { setOps([]); setOut('') }}>Clear</span>
        </div>
        <div className="row" style={{ gap: 16, marginBottom: 12 }}>
          <label className="row" style={{ gap: 6 }}><input type="radio" checked={target === 'local'} onChange={() => setTarget('local')} /> Local simulator</label>
          <label className="row" style={{ gap: 6 }}><input type="radio" checked={target === 'ibm'} onChange={() => setTarget('ibm')} /> IBM Quantum</label>
        </div>
        <div className="codeview">{code}</div>
        <div className="term-bar" style={{ marginTop: 12 }}>
          <button className="btn good" onClick={runChosen} disabled={busy}>{busy ? 'Running...' : (target === 'ibm' ? 'Run on IBM Quantum ▶' : 'Run on simulator ▶')}</button>
          <button className="btn soft" onClick={() => onSend(code)}>Send to Terminal</button>
        </div>
        {out && <div className={'output' + (err ? ' err' : '')} style={{ marginTop: 12 }}>{out}</div>}
        {target === 'ibm' && <p className="muted" style={{ marginTop: 10, fontSize: '.8rem' }}>IBM runs use your saved account from Configuration and submit to a real device queue.</p>}
      </div>
    </div>
  )
}
