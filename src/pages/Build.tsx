import { useState } from 'react'
import Terminal from './Terminal'
import CanvasBuilder from './CanvasBuilder'

const EXAMPLE = `from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

sim = AerSimulator()
counts = sim.run(transpile(qc, sim), shots=1024).result().get_counts()
print(counts)`

export default function Build() {
  const [mode, setMode] = useState<'terminal' | 'canvas'>('terminal')
  const [code, setCode] = useState(EXAMPLE)

  return (
    <div>
      <div className="page-head">
        <h1>Build</h1>
        <div className="seg" data-mode={mode}>
          <button className={mode === 'terminal' ? 'on' : ''} onClick={() => setMode('terminal')}>Terminal</button>
          <button className={mode === 'canvas' ? 'on' : ''} onClick={() => setMode('canvas')}>Canvas</button>
          <span className="seg-knob" />
        </div>
      </div>
      {mode === 'terminal'
        ? <Terminal code={code} setCode={setCode} example={EXAMPLE} />
        : <CanvasBuilder onSend={(c) => { setCode(c); setMode('terminal') }} />}
    </div>
  )
}
