import React, { useState, useEffect } from 'react'
import { UserPlus, Edit2, ShieldAlert, CheckCircle, Search } from 'lucide-react'
import { userService } from '../../services/userService'
import { useRBAC } from '../../context/RBACContext'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS, ROLE_COLORS, ROLES } from '../../utils/permissions'
import Modal from '../../components/shared/Modal'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { formatDate } from '../../utils/formatters'

// ── Role badge ─────────────────────────────────────────────────────────────────
export const RoleBadge = ({ role, size = 'sm' }) => {
  const cfg = ROLE_COLORS[role] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 9px' : '4px 12px',
      borderRadius: 99, fontSize: size === 'sm' ? 11 : 12.5,
      fontWeight: 700, fontFamily: 'Outfit, sans-serif',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

// ── Edit role modal ────────────────────────────────────────────────────────────
const EditRoleModal = ({ user, open, onClose, onSaved }) => {
  const { can }   = useRBAC()
  const { profile } = useAuth()
  const [role,    setRole]    = useState(user?.role || '')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { setRole(user?.role || '') }, [user])

  const handleSave = async () => {
    if (!role) return
    setSaving(true)
    try {
      await userService.updateRole(user.id, role)
      onSaved()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  // Super admin can assign any role; general manager cannot assign super_admin
  const assignableRoles = Object.values(ROLES).filter(r => {
    if (profile?.role === ROLES.SUPER_ADMIN) return true
    return r !== ROLES.SUPER_ADMIN
  })

  return (
    <Modal open={open} onClose={onClose} title={`Change Role — ${user?.full_name}`} width={420}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={handleSave}>Save Role</Button></>}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Current role: <RoleBadge role={user?.role} />
        </div>
        <label>New Role</label>
        <select className="input-base" value={role} onChange={e => setRole(e.target.value)}>
          {assignableRoles.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        {role && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: ROLE_COLORS[role]?.bg || '#f9fafb', border: `1px solid ${ROLE_COLORS[role]?.border || '#e5e7eb'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: ROLE_COLORS[role]?.color, marginBottom: 4 }}>
              {ROLE_LABELS[role]}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {ROLE_DESCRIPTIONS[role]}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

const ROLE_DESCRIPTIONS = {
  super_admin:          'Full unrestricted access. Owner / Director level.',
  general_manager:      'Manages all operations. Can approve purchases, returns, and view profits.',
  branch_manager:       'Controls assigned branch. Cannot view other branches or global profits.',
  inventory_manager:    'Stock operations only. Can update, transfer, and receive inventory.',
  sales_rep:            'Creates sales and quotations. Cannot edit prices or view margins.',
  accountant:           'Financial records only. Manages credits, payments, and financial reports.',
  delivery_coordinator: 'Assigns drivers, manages deliveries and routes.',
  driver:               'Views and updates assigned deliveries only.',
  procurement_officer:  'Creates purchase orders and manages supplier relationships.',
}

// ── Invite modal ───────────────────────────────────────────────────────────────
const InviteModal = ({ open, onClose, onInvited }) => {
  const [form,   setForm]   = useState({ full_name: '', email: '', role: 'sales_rep' })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleInvite = async () => {
    if (!form.full_name || !form.email || !form.role) return alert('Fill all fields')
    setSaving(true)
    try {
      // In production: call Supabase Admin API or send magic link via edge function.
      // Here we show instructions since client-side cannot create Auth users directly.
      alert(
        `To invite ${form.full_name}:\n\n` +
        `1. Go to Supabase Dashboard → Authentication → Users → Invite User\n` +
        `2. Enter email: ${form.email}\n` +
        `3. After they accept, run this SQL:\n\n` +
        `UPDATE users SET full_name='${form.full_name}', role='${form.role}' WHERE email='${form.email}';`
      )
      onClose()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Member" width={460}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={<UserPlus />} loading={saving} onClick={handleInvite}>Send Invite Instructions</Button></>}>
      <div>
        <div className="form-group"><label>Full Name *</label><input className="input-base" value={form.full_name} onChange={set('full_name')} placeholder="e.g. Kamal Perera" /></div>
        <div className="form-group"><label>Email Address *</label><input className="input-base" type="email" value={form.email} onChange={set('email')} placeholder="kamal@example.com" /></div>
        <div className="form-group">
          <label>Role *</label>
          <select className="input-base" value={form.role} onChange={set('role')}>
            {Object.values(ROLES).filter(r => r !== ROLES.SUPER_ADMIN).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div style={{ background: 'var(--info-bg)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--info)' }}>
          ℹ️ The user must be invited from the Supabase Auth dashboard. This shows you the SQL to run after they accept.
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const UserManagement = () => {
  const { can, hasRole }   = useRBAC()
  const { profile: me }    = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [editUser,setEditUser] = useState(null)
  const [showInvite, setShowInvite] = useState(false)

  const fetchUsers = () => {
    setLoading(true)
    userService.getAll()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive'
    try {
      await userService.setStatus(user.id, newStatus)
      fetchUsers()
    } catch (err) { alert(err.message) }
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const canEditRoles = hasRole(ROLES.SUPER_ADMIN, ROLES.GENERAL_MANAGER)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
          Team Members ({users.length})
        </h3>
        {canEditRoles && (
          <Button size="sm" icon={<UserPlus />} onClick={() => setShowInvite(true)}>
            Invite Member
          </Button>
        )}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: '1.5px solid var(--card-border)', borderRadius: 9, background: 'var(--card-bg)', marginBottom: 16 }}>
        <Search size={14} color="var(--text-muted)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or role…"
          style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, fontFamily: 'DM Sans, sans-serif', color: 'var(--text-primary)', background: 'transparent' }}
        />
      </div>

      {/* User table */}
      <div style={{ border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Loader /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p>No team members found</p>
          </div>
        ) : filtered.map((user, idx) => (
          <div
            key={user.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: user.status === 'inactive' ? '#fafafa' : 'transparent',
              opacity: user.status === 'inactive' ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: ROLE_COLORS[user.role]?.bg || '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800,
              color: ROLE_COLORS[user.role]?.color || '#6b7280',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                  {user.full_name}
                </span>
                {user.id === me?.id && (
                  <span style={{ fontSize: 10.5, background: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>You</span>
                )}
                {user.status === 'inactive' && (
                  <span style={{ fontSize: 10.5, background: '#f3f4f6', color: '#9ca3af', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>Inactive</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
            </div>

            {/* Role */}
            <div style={{ flexShrink: 0 }}>
              <RoleBadge role={user.role} />
            </div>

            {/* Joined */}
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
              {formatDate(user.created_at, 'dd MMM yy')}
            </div>

            {/* Actions (only shown to admins, not on own account for role changes) */}
            {canEditRoles && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {user.id !== me?.id && (
                  <button
                    onClick={() => setEditUser(user)}
                    title="Change role"
                    style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Edit2 size={13} color="var(--text-secondary)" />
                  </button>
                )}
                {user.id !== me?.id && (
                  <button
                    onClick={() => handleToggleStatus(user)}
                    title={user.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                    style={{
                      width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: user.status === 'inactive' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                      background: user.status === 'inactive' ? '#f0fdf4' : '#fef2f2',
                    }}
                  >
                    {user.status === 'inactive'
                      ? <CheckCircle size={13} color="#16a34a" />
                      : <ShieldAlert  size={13} color="#dc2626" />}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      <EditRoleModal
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSaved={fetchUsers}
      />
      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={fetchUsers}
      />
    </div>
  )
}

export default UserManagement