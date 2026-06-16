import { ipc } from '../lib/ipc'

export default function About() {
  return (
    <div>
      <div className="page-head"><h1>About</h1></div>
      <div className="card" style={{ maxWidth: 640 }}>
        <p style={{ marginTop: 0 }}>
          <b>Bodhaka Quantum Summit</b> lets you run authentic Qiskit programs on real IBM Quantum hardware
          from your own computer, with your own account. Build circuits visually on the Canvas or write them
          in the Terminal, then run on a simulator or a real device.
        </p>
        <p className="muted">Version 0.1.0 (MVP)</p>
        <p className="muted">Your API key and credentials stay on this computer and are never sent to Bodhaka.</p>
        <p>Product of <span className="link" onClick={() => ipc.openExternal('https://bodhaka.org')}>BuoyantWave Learning Technologies LLP</span>.</p>
        <p className="muted" style={{ fontSize: '.8rem' }}>Guided help and more is coming soon. This page will be wired up later.</p>
      </div>
    </div>
  )
}
