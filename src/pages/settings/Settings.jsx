import React, { useState, useEffect } from 'react'
import {
  User, Bell, Shield, Building2, Eye, EyeOff,
  Save, CheckCircle, Users
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useRBAC } from '../../context/RBACContext'
import { supabase } from '../../services/supabase'
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../utils/permissions'
import Button from '../../components/shared/Button'
import UserManagement from './UserManagement'

// ── Role badge (small, inline) ────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = ROLE_COLORS[role] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11.5, fontWeight: 700,
      fontFamily: 'Outfit, sans-serif',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, icon: Icon, children }) => (
  <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
    <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color="#f97316" />
      </div>
      <div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
    <div style={{ padding: '18px 22px' }}>{children}</div>
  </div>
)

// ── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, label, description }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 23, borderRadius: 99,
        background: value ? '#f97316' : '#e5e7eb',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: value ? 21 : 2,
        width: 19, height: 19, borderRadius: 99,
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  </div>
)

// ── Main Settings page ────────────────────────────────────────────────────────
const Settings = () => {
  const { user, profile, signOut } = useAuth()
  const { role, hasRole, can }     = useRBAC()

  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [showPass,setShowPass]= useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    email:     user?.email || '',
  })

  const [passForm, setPassForm] = useState({ newPass: '', confirm: '' })

  const [notif, setNotif] = useState({
    lowStockAlerts: true, outOfStockAlerts: true,
    dailySummary: false,
  })

  const [biz, setBiz] = useState({
    businessName: 'Rathna Traders', currency: 'LKR',
    timezone: 'Asia/Colombo', lowStockThreshold: 10,
    autoGenerateAlerts: true,
  })

  useEffect(() => {
    setProfileForm({ full_name: profile?.full_name || '', email: user?.email || '' })
  }, [profile, user])

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await supabase.from('users').update({ full_name: profileForm.full_name }).eq('id', user?.id)
      showSaved()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (passForm.newPass !== passForm.confirm) return alert('Passwords do not match')
    if (passForm.newPass.length < 6) return alert('Password must be at least 6 characters')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passForm.newPass })
      if (error) throw error
      setPassForm({ newPass: '', confirm: '' })
      showSaved()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  // Build tab list based on role
  const TABS = [
    { key: 'profile',      label: 'Profile',       icon: User      },
    { key: 'notifications',label: 'Notifications', icon: Bell      },
    // Business settings — GM and above
    ...(hasRole(ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER, ROLES.BRANCH_MANAGER)
      ? [{ key: 'business', label: 'Business', icon: Building2 }]
      : []
    ),
    { key: 'security',     label: 'Security',      icon: Shield    },
    // User Management — super_admin and general_manager only
    ...(hasRole(ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER)
      ? [{ key: 'users', label: 'Team Members', icon: Users }]
      : []
    ),
  ]

  return (
    <div className="page-wrapper" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Saved banner */}
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--success-bg)', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--success)', animation: 'fadeIn 0.2s ease' }}>
          <CheckCircle size={15} /> Changes saved successfully
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, minWidth: 80, padding: '8px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: activeTab === tab.key ? '#fff7ed' : 'transparent',
                color: activeTab === tab.key ? '#f97316' : 'var(--text-muted)',
                fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={13} />
              <span className="hide-mobile">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === 'profile' && (
        <SectionCard title="Personal Information" subtitle="Your account details" icon={User}>
          {/* Current role display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--content-bg)', borderRadius: 9, marginBottom: 18 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your role:</span>
            <RoleBadge role={role} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="input-base" value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input className="input-base" value={profileForm.email} disabled style={{ opacity: 0.55 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Contact admin to change email</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button icon={<Save />} loading={saving} onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </SectionCard>
      )}

      {/* ── Notifications tab ── */}
      {activeTab === 'notifications' && (
        <SectionCard title="Notification Preferences" subtitle="Choose which alerts you receive" icon={Bell}>
          <Toggle value={notif.lowStockAlerts}   onChange={v => setNotif(s=>({...s,lowStockAlerts:v}))}   label="Low Stock Alerts"    description="When products fall below reorder level" />
          <Toggle value={notif.outOfStockAlerts} onChange={v => setNotif(s=>({...s,outOfStockAlerts:v}))} label="Out of Stock Alerts"  description="Immediate alert when stock hits zero" />
          <Toggle value={notif.dailySummary}     onChange={v => setNotif(s=>({...s,dailySummary:v}))}     label="Daily Summary"        description="End-of-day business summary" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button icon={<Save />} onClick={showSaved}>Save Preferences</Button>
          </div>
        </SectionCard>
      )}

      {/* ── Business tab — GM and above only ── */}
      {activeTab === 'business' && hasRole(ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER, ROLES.BRANCH_MANAGER) && (
        <SectionCard title="Business Configuration" subtitle="Store and inventory settings" icon={Building2}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
            <div className="form-group">
              <label>Business Name</label>
              <input className="input-base" value={biz.businessName} onChange={e => setBiz(b=>({...b,businessName:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select className="input-base" value={biz.currency} onChange={e => setBiz(b=>({...b,currency:e.target.value}))}>
                <option value="LKR">LKR — Sri Lankan Rupee</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select className="input-base" value={biz.timezone} onChange={e => setBiz(b=>({...b,timezone:e.target.value}))}>
                <option value="Asia/Colombo">Asia/Colombo (IST +5:30)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="form-group">
              <label>Default Low Stock Threshold</label>
              <input className="input-base" type="number" min="1" value={biz.lowStockThreshold} onChange={e => setBiz(b=>({...b,lowStockThreshold:parseInt(e.target.value)||10}))} />
            </div>
          </div>
          <Toggle value={biz.autoGenerateAlerts} onChange={v => setBiz(b=>({...b,autoGenerateAlerts:v}))} label="Auto-Generate Low Stock Alerts" description="Automatically create alerts when stock falls below reorder level" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button icon={<Save />} onClick={showSaved}>Save Settings</Button>
          </div>
        </SectionCard>
      )}

      {/* ── Security tab ── */}
      {activeTab === 'security' && (
        <>
          <SectionCard title="Change Password" subtitle="Update your login password" icon={Shield}>
            <div style={{ maxWidth: 400 }}>
              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-base"
                    type={showPass ? 'text' : 'password'}
                    value={passForm.newPass}
                    onChange={e => setPassForm(f=>({...f,newPass:e.target.value}))}
                    placeholder="Minimum 6 characters"
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(s=>!s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    {showPass ? <EyeOff size={15} color="var(--text-muted)" /> : <Eye size={15} color="var(--text-muted)" />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input className="input-base" type="password" value={passForm.confirm} onChange={e => setPassForm(f=>({...f,confirm:e.target.value}))} placeholder="Repeat new password" />
                {passForm.newPass && passForm.confirm && passForm.newPass !== passForm.confirm && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button icon={<Save />} loading={saving} onClick={handleChangePassword}>Update Password</Button>
            </div>
          </SectionCard>

          <SectionCard title="Danger Zone" subtitle="Irreversible account actions" icon={Shield}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#dc2626', marginBottom: 3 }}>Sign Out</div>
                <div style={{ fontSize: 12.5, color: '#9ca3af' }}>Sign out from all devices</div>
              </div>
              <Button variant="danger" onClick={signOut}>Sign Out</Button>
            </div>
          </SectionCard>
        </>
      )}

      {/* ── Team Members tab — super_admin + GM only ── */}
      {activeTab === 'users' && hasRole(ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER) && (
        <SectionCard title="Team Members" subtitle="Manage users and their roles" icon={Users}>
          <UserManagement />
        </SectionCard>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
        HardwareAI v2.0 · Powered by <span style={{ color: '#f97316', fontWeight: 600 }}>Forgera</span>
      </div>
    </div>
  )
}

export default Settings