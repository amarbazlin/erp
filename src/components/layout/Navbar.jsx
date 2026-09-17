import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, LogOut, ChevronDown, Settings, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useRBAC } from '../../context/RBACContext'
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/permissions'
import { formatDate } from '../../utils/formatters'
import AppLogo from '../shared/AppLogo'

const Navbar = ({ alertCount = 0, onToggleSidebar, isMobile }) => {
  const { profile, signOut } = useAuth()
  const { role }             = useRBAC()
  const navigate             = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const today    = formatDate(new Date(), 'EEEE, dd MMM yyyy')
  const roleCfg  = ROLE_COLORS[role] || { bg: '#f3f4f6', color: '#6b7280' }
  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  return (
    <header style={{
      ...S.navbar,
      height: isMobile ? 56 : 64,
      padding: isMobile ? '0 14px' : '0 28px',
    }}>

      {/* ── Left: hamburger (mobile) OR greeting (desktop) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger — mobile / tablet only */}
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            style={S.iconBtn}
            aria-label="Toggle menu"
          >
            <Menu size={18} color="var(--text-secondary)" />
          </button>
        )}

        {/* Greeting — hidden on mobile to save space */}
        {!isMobile && (
          <div>
            <h1 style={S.greeting}>
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'} 👋
            </h1>
            <p style={S.date}>{today}</p>
          </div>
        )}

        {/* Mobile: show logo + brand */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppLogo size={24} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            Forgera ERP
            </span>
          </div>
        )}
      </div>

      {/* ── Right: actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>

        {/* Search — desktop only inline, mobile as icon */}
        {!isMobile ? (
          <div style={S.searchWrap}>
            <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              style={S.searchInput}
              placeholder="Search products, sales…"
            />
          </div>
        ) : (
          <button style={S.iconBtn} onClick={() => setSearchOpen(o => !o)} aria-label="Search">
            <Search size={17} color="var(--text-secondary)" />
          </button>
        )}

        {/* Alerts bell */}
        <button
          style={{ ...S.iconBtn, position: 'relative' }}
          onClick={() => navigate('/inventory')}
          aria-label="Alerts"
        >
          <Bell size={17} color="var(--text-secondary)" />
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: 99,
              background: 'var(--danger)',
              border: '1.5px solid #fff',
            }} />
          )}
        </button>

        {/* Profile dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            style={S.profileBtn}
            onClick={() => setDropdownOpen(o => !o)}
            aria-label="Profile menu"
          >
            <div style={S.avatar}>{initials}</div>
            {/* Hide name/role text on mobile */}
            {!isMobile && (
              <div style={S.profileInfo}>
                <span style={S.profileName}>{profile?.full_name || 'User'}</span>
                <span style={{ ...S.profileRole, color: roleCfg.color }}>{ROLE_LABELS[role] || role}</span>
              </div>
            )}
            <ChevronDown
              size={13} color="var(--text-muted)"
              style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
            />
          </button>

          {dropdownOpen && (
            <>
              <div style={S.dropdownOverlay} onClick={() => setDropdownOpen(false)} />
              <div style={{
                ...S.dropdown,
                right: 0,
                minWidth: isMobile ? 200 : 230,
              }}>
                {/* User info header */}
                <div style={S.dropdownHeader}>
                  <div style={{ ...S.avatar, width: 36, height: 36, fontSize: 14, borderRadius: 10 }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile?.full_name}
                    </div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                      background: roleCfg.bg, color: roleCfg.color,
                      padding: '1px 7px', borderRadius: 99, display: 'inline-block', marginTop: 2,
                    }}>
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                </div>

                <div style={S.dropdownDivider} />

                <button
                  style={S.dropdownItem}
                  onClick={() => { navigate('/settings'); setDropdownOpen(false) }}
                >
                  <Settings size={14} /> Profile & Settings
                </button>

                <div style={S.dropdownDivider} />

                <button
                  style={{ ...S.dropdownItem, color: 'var(--danger)', marginBottom: 4 }}
                  onClick={handleSignOut}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile search bar (expands below navbar) ── */}
      {isMobile && searchOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--card-border)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 49,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            autoFocus
            placeholder="Search products, sales, customers…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text-primary)', background: 'transparent',
            }}
          />
          <button onClick={() => setSearchOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>
      )}
    </header>
  )
}

const S = {
  navbar: {
    background: 'var(--card-bg)',
    borderBottom: '1px solid var(--card-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0, zIndex: 50,
    boxShadow: 'var(--shadow-xs)',
    flexShrink: 0,
  },
  greeting: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 15, fontWeight: 700,
    color: 'var(--text-primary)', margin: 0,
  },
  date: { fontSize: 11.5, color: 'var(--text-muted)', margin: '2px 0 0' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--content-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 8, padding: '7px 14px', width: 220,
  },
  searchInput: {
    border: 'none', background: 'transparent', outline: 'none',
    fontSize: 13, color: 'var(--text-primary)', width: '100%',
    fontFamily: 'DM Sans, sans-serif',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 9,
    border: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  profileBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '4px 8px 4px 4px',
    borderRadius: 10, border: '1px solid var(--card-border)',
    background: 'var(--card-bg)', cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  avatar: {
    width: 28, height: 28, borderRadius: 7,
    background: 'linear-gradient(135deg, #f97316, #ea6c00)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800, fontFamily: 'Outfit, sans-serif', flexShrink: 0,
  },
  profileInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  profileName: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' },
  profileRole: { fontSize: 10, fontWeight: 600, fontFamily: 'Outfit, sans-serif' },
  dropdownOverlay: { position: 'fixed', inset: 0, zIndex: 199 },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)',
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 200, overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 16px',
  },
  dropdownDivider: { height: 1, background: 'var(--card-border)' },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', width: '100%',
    border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 13,
    color: 'var(--text-secondary)',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'background 0.12s',
    WebkitTapHighlightColor: 'transparent',
  },
}

export default Navbar