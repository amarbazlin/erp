import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import AppLogo from '../../components/shared/AppLogo'

const Login = () => {
  const { signIn }   = useAuth()
  const navigate     = useNavigate()
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

  return (
    <div className="login-screen" style={S.root}>
      <div style={S.card}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.logoIcon}><AppLogo size={26} /></div>
          <span style={S.brandName}>ForgeraERP</span>
        </div>

        <h2 style={S.title}>Sign in</h2>
        <p style={S.subtitle}>Enter your credentials to continue</p>

        {error && <div style={S.errorBox}>{error}</div>}

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

          <button
            type="submit"
            disabled={loading}
            style={{ ...S.submitBtn, marginTop: 8, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Styles ── */
const S = {
  root: {
    minHeight: '100vh',
    background: '#0d1117',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'DM Sans, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--card-bg)',
    borderRadius: 20,
    padding: '36px 32px',
    border: '1px solid var(--card-border)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(249,115,22,0.3)',
    overflow: 'hidden',
    padding: 3,
    flexShrink: 0,
  },
    brandName: {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 800,
    fontSize: 20,
    color: '#2d2d2d',
    letterSpacing: '-0.02em',
  },
  title: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  errorBox: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg,#f97316,#ea6c00)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Outfit, sans-serif',
    boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
    transition: 'opacity 0.15s',
    letterSpacing: '0.01em',
  },
}

export default Login
