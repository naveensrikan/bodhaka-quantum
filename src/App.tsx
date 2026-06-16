import { useEffect, useState } from 'react'
import Build from './pages/Build'
import History from './pages/History'
import Configuration from './pages/Configuration'
import Dashboard from './pages/Dashboard'
import AboutDialog from './components/AboutDialog'
import NoticeDialog from './components/NoticeDialog'
import { ipc } from './lib/ipc'

type Page = 'build' | 'history' | 'config' | 'dashboard'

const NAV: { id: Page; label: string; ico: string }[] = [
  { id: 'build', label: 'Build', ico: '▤' },
  { id: 'history', label: 'History', ico: '◴' },
  { id: 'config', label: 'Configuration', ico: '⚙' },
  { id: 'dashboard', label: 'Dashboard', ico: '◷' },
]

export default function App() {
  const [page, setPage] = useState<Page>('build')
  const [about, setAbout] = useState(false)
  const [notice, setNotice] = useState<'gate' | 'review' | null>(null)

  // First launch: show the legal notice and block until the user agrees.
  useEffect(() => { ipc.getNotice().then((n) => { if (!n.agreed) setNotice('gate') }) }, [])

  return (
    <>
      <div className="bg-dots" />
      <div className="app">
        <aside className="side">
          <div className="brand">
            <img src="logo.png" className="logo" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            <div><b>Bodhaka Quantum</b><span>Summit</span></div>
          </div>
          <nav className="nav">
            {NAV.map((n) => (
              <button key={n.id} className={page === n.id ? 'on' : ''} onClick={() => setPage(n.id)}>
                <span className="ico">{n.ico}</span>{n.label}
              </button>
            ))}
            <button onClick={() => setAbout(true)}><span className="ico">ⓘ</span>About</button>
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
          {page === 'history' && <History />}
          {page === 'config' && <Configuration onShowNotice={() => setNotice('review')} />}
          {page === 'dashboard' && <Dashboard />}
        </main>
      </div>

      {about && <AboutDialog onClose={() => setAbout(false)} />}
      {notice && (
        <NoticeDialog
          mode={notice}
          onAgree={async () => { await ipc.agreeNotice(); setNotice(null) }}
          onClose={() => setNotice(null)}
        />
      )}
    </>
  )
}
