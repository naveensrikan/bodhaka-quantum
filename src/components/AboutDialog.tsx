import { ipc } from '../lib/ipc'

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <img src="logo.png" className="modal-logo" alt="Bodhaka" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <h2 style={{ textAlign: 'center' }}>Bodhaka Quantum Summit</h2>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>Version 0.1.0</p>
        <p>
          Bodhaka Quantum Summit is an independent learning environment for quantum programming. You can build
          quantum circuits visually or write them directly, run them on a simulator on your own computer, and,
          when you choose, run them on real quantum hardware through your own provider account.
        </p>
        <p>
          The programming model is authentic Qiskit. Everything you write here is standard, portable code that
          runs the same way in any professional Qiskit setup, so what you learn carries directly into real
          quantum development.
        </p>
        <p>
          Your credentials stay on your computer, encrypted, and are never sent to Bodhaka. This application has
          no backend that can see your keys or your programs.
        </p>
        <p style={{ fontWeight: 700 }}>
          Bodhaka Quantum Summit has no affiliation with IBM. It connects to IBM Quantum only through your own
          account and credentials.
        </p>
        <p>Product of <span className="link" onClick={() => ipc.openExternal('https://bodhaka.org')}>BuoyantWave Learning Technologies LLP</span>.</p>
      </div>
    </div>
  )
}
