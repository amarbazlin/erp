import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Zap, CheckCircle } from 'lucide-react'
import AppLogo from '../../components/shared/AppLogo'

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

const FEATURES = [
  'Real-time stock tracking',
  'AI-powered demand forecasting',
  'Smart reorder alerts',
  'Supplier performance analytics',
]

const Login = () => {
  const { signIn }   = useAuth()
  const navigate     = useNavigate()
  const isMobile     = useIsMobile()
  const [email,     setEmail]    = useState('')
  const [password,  setPassword] = useState('')
  const [showPass,  setShowPass] = useState(false)
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error.message || 'Invalid credentials. Please try again.')
    } else {
      navigate('/')
    }
  }

  /* ── Mobile layout ─────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={M.root}>
        {/* Top brand strip */}
        <div style={M.topBar}>
          <div style={M.logoIcon}><AppLogo size={22} /></div>
          <span style={M.logoText}>Forgera OS</span>
          <span style={M.badge}>ForgeraAI</span>
        </div>

        {/* Hero text */}
        <div style={M.hero}>
          <h1 style={M.headline}>Inventory intelligence<br />for hardware retail</h1>
          <p style={M.subtext}>
            AI-powered stock management built for Sri Lankan distribution businesses.
          </p>
          {/* Feature pills */}
          <div style={M.pills}>
            {FEATURES.map(f => (
              <div key={f} style={M.pill}>
                <CheckCircle size={11} color="#f97316" style={{ flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div style={M.formCard}>
          <h2 style={M.formTitle}>Sign in</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 22 }}>
            Enter your credentials to continue
          </p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <input
                className="input-base"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-base"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
                >
                  {showPass ? <EyeOff size={17} color="var(--text-muted)" /> : <Eye size={17} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.submitBtn, marginTop: 8, padding: '13px', fontSize: 15, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 18 }}>
            Contact your administrator to get access
          </p>
        </div>
      </div>
    )
  }

  /* ── Desktop layout (unchanged) ────────────────────────── */
  return (
    <div style={styles.root}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}><AppLogo size={26} /></div>
            <span style={styles.logoText}>Forgera OS</span>
          </div>
          <h1 style={styles.headline}>
            Inventory intelligence<br />for hardware retail
          </h1>
          <p style={styles.subtext}>
            AI-powered demand forecasting, smart reorder alerts, and real-time
            analytics — built for Sri Lankan distribution businesses.
          </p>
          <div style={styles.features}>
            {FEATURES.map(f => (
              <div key={f} style={styles.featureItem}>
                <div style={styles.featureDot} />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div style={styles.poweredBy}>
            Powered by <span style={{ color: '#f97316', fontWeight: 600 }}>ForgeraAI</span>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={styles.formTitle}>Sign in to your account</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Enter your credentials to access the dashboard
            </p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <input
                className="input-base"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-base"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                >
                  {showPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
            Contact your administrator to get access
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Desktop styles (unchanged) ── */
const styles = {
  root: { display: 'flex', height: '100vh', fontFamily: 'DM Sans, sans-serif' },
  left: { flex: 1, background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 80px' },
  leftInner: { maxWidth: 420 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 },
  logoIcon: { width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(249,115,22,0.25)', overflow: 'hidden', padding: 3 },
  logoText: { fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.03em' },
  headline: { fontFamily: 'Outfit,sans-serif', fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16 },
  subtext: { fontSize: 14.5, color: '#6b7280', lineHeight: 1.7, marginBottom: 36 },
  features: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#9ca3af' },
  featureDot: { width: 7, height: 7, borderRadius: 99, background: '#f97316', flexShrink: 0 },
  poweredBy: { fontSize: 12, color: '#374151', borderTop: '1px solid #1e2530', paddingTop: 24 },
  right: { width: 480, background: 'var(--content-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 },
  formCard: { width: '100%', background: 'var(--card-bg)', borderRadius: 20, padding: '36px 36px', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-md)' },
  formTitle: { fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  errorBox: { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  submitBtn: { width: '100%', padding: '11px', background: 'linear-gradient(135deg,#f97316,#ea6c00)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: 'Outfit,sans-serif', boxShadow: '0 4px 14px rgba(249,115,22,0.35)', marginTop: 4, transition: 'opacity 0.15s', letterSpacing: '0.01em' },
}

/* ── Mobile-only styles ── */
const M = {
  root: {
    minHeight: '100vh',
    background: '#0d1117',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'DM Sans, sans-serif',
    overflowY: 'auto',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '18px 20px 0',
  },
  logoIcon: {
    width: 32, height: 32, borderRadius: 9,
    background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', padding: 2,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
  },
  logoText: {
    fontFamily: 'Outfit,sans-serif',
    fontWeight: 800, fontSize: 17,
    color: '#fff', letterSpacing: '-0.02em',
    flex: 1,
  },
  badge: {
    fontSize: 10, fontWeight: 700,
    background: 'rgba(249,115,22,0.15)',
    color: '#f97316',
    padding: '3px 9px', borderRadius: 99,
    border: '1px solid rgba(249,115,22,0.3)',
    fontFamily: 'Outfit,sans-serif',
  },
  hero: {
    padding: '28px 20px 24px',
  },
  headline: {
    fontFamily: 'Outfit,sans-serif',
    fontSize: 26, fontWeight: 800,
    color: '#fff', lineHeight: 1.2,
    letterSpacing: '-0.025em',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 13.5, color: '#6b7280',
    lineHeight: 1.65, marginBottom: 18,
  },
  pills: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
  },
  pill: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, color: '#9ca3af',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '5px 10px', borderRadius: 99,
  },
  formCard: {
    background: 'var(--card-bg)',
    borderRadius: '20px 20px 0 0',
    padding: '28px 22px 36px',
    flex: 1,
    marginTop: 4,
    boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
  },
  formTitle: {
    fontFamily: 'Outfit,sans-serif',
    fontSize: 20, fontWeight: 800,
    color: 'var(--text-primary)', margin: 0,
  },
}

export default Login