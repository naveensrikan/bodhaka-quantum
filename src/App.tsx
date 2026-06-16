import { useState } from 'react'
import Build from './pages/Build'
import Configuration from './pages/Configuration'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import { ipc } from './lib/ipc'

type Page = 'build' | 'config' | 'dashboard' | 'about'

const NAV: { id: Page; label: string; ico: string }[] = [
  { id: 'build', label: 'Build', ico: '▤' },
  { id: 'config', label: 'Configuration', ico: '⚙' },
  { id: 'dashboard', label: 'Dashboard', ico: '◷' },
  { id: 'about', label: 'About', ico: 'ⓘ' },
]

export default function App() {
  const [page, setPage] = useState<Page>('build')
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="logo" style={{ background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>B</div>
          <div><b>Bodhaka Quantum</b><span>Summit</span></div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} className={page === n.id ? 'on' : ''} onClick={() => setPage(n.id)}>
              <span className="ico">{n.ico}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          Product of{' '}
          <a href="https://bodhaka.org" onClick={(e) => { e.preventDefault(); ipc.openExternal('https://bodhaka.org') }}>
            BuoyantWave Learning Technologies LLP
          </a>
        </div>
      </aside>
      <main className="main">
        {page === 'build' && <Build />}
        {page === 'config' && <Configuration />}
        {page === 'dashboard' && <Dashboard />}
        {page === 'about' && <About />}
      </main>
    </div>
  )
}
