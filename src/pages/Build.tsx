import { useEffect, useState } from 'react'
import Terminal from './Terminal'
import CanvasBuilder from './CanvasBuilder'
import { LOCAL_EXAMPLE } from '../lib/examples'

export default function Build() {
  const [mode, setMode] = useState<'terminal' | 'canvas'>('terminal')
  // Persist the program across screen switches and restarts.
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem('summit.code') || LOCAL_EXAMPLE } catch { return LOCAL_EXAMPLE }
  })
  useEffect(() => { try { localStorage.setItem('summit.code', code) } catch {} }, [code])

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
      {/* Both stay mounted so a running program survives flipping the toggle. */}
      <div style={{ display: mode === 'terminal' ? 'block' : 'none' }}>
        <Terminal code={code} setCode={setCode} />
      </div>
      <div style={{ display: mode === 'canvas' ? 'block' : 'none' }}>
        <CanvasBuilder onSend={(c) => { setCode(c); setMode('terminal') }} />
      </div>
    </div>
  )
}
