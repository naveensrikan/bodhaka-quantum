export default function NoticeDialog({ mode, onAgree, onClose }: { mode: 'gate' | 'review'; onAgree: () => void; onClose: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <img src="logo.png" className="modal-logo" alt="Bodhaka" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <h2 style={{ textAlign: 'center' }}>Please read before you continue</h2>
        <div className="notice-body">
          <p style={{ fontWeight: 700 }}>
            Bodhaka Quantum Summit has no affiliation, association, endorsement, or sponsorship with IBM
            or with any quantum hardware provider whatsoever.
          </p>
          <p>
            This application is an independent development and learning environment created by BuoyantWave
            Learning Technologies LLP, provided to help people learn and practise quantum programming. It
            connects to third-party quantum services such as IBM Quantum only through credentials that you
            supply from your own account, and your use of those services is governed by their own terms.
          </p>
          <p>
            The software is provided on an "as is" and "as available" basis, without warranties of any kind,
            whether express or implied, including but not limited to fitness for a particular purpose, accuracy
            of results, or uninterrupted operation. BuoyantWave Learning Technologies LLP provides only the
            development environment and is not responsible for the programs you write or run, for any results
            they produce, for any usage, charges, or costs incurred on your provider accounts, or for any data
            loss, damage, or other consequence arising from your use of this software.
          </p>
          <p>
            You are solely responsible for the code you create and execute, for keeping your credentials secure,
            and for complying with the terms of any third-party service you connect to.
          </p>
          <p style={{ fontWeight: 700 }}>
            By continuing, you agree to hold harmless, release, and indemnify BuoyantWave Learning Technologies
            LLP, its members, and its affiliates from and against any and all claims, liabilities, damages, losses,
            costs, and expenses arising out of or related to your use of this software.
          </p>
          <p>If you do not agree, do not use this application.</p>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 12, marginTop: 16 }}>
          {mode === 'gate' ? (
            <>
              <button className="btn" onClick={onAgree}>I have read and I agree</button>
              <button className="btn soft" onClick={() => { try { window.close() } catch {} }}>Decline and exit</button>
            </>
          ) : (
            <button className="btn" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  )
}
