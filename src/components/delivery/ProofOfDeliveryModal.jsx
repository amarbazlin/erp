import React, { useRef, useState } from 'react'
import { Camera, CheckSquare, PenLine } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'

const TABS = [
  { key: 'checkbox',  label: 'Confirm',    icon: CheckSquare },
  { key: 'signature', label: 'Signature',  icon: PenLine },
  { key: 'photo',     label: 'Photo',      icon: Camera },
]

const ProofOfDeliveryModal = ({ open, delivery, onClose, onConfirm, loading }) => {
  const [tab, setTab]           = useState('checkbox')
  const [confirmed, setConfirmed] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const canvasRef               = useRef(null)
  const drawing                 = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  const reset = () => {
    setTab('checkbox')
    setConfirmed(false)
    setPhotoFile(null)
    setHasSignature(false)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const handleClose = () => { reset(); onClose() }

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    const { x, y } = getPos(e, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDraw = () => { drawing.current = false }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const canSubmit = () => {
    if (tab === 'checkbox')  return confirmed
    if (tab === 'signature') return hasSignature
    if (tab === 'photo')     return !!photoFile
    return false
  }

  const handleSubmit = () => {
    const payload = { proofType: tab }
    if (tab === 'photo' && photoFile)     payload.file = photoFile
    if (tab === 'signature' && hasSignature) payload.signatureDataUrl = canvasRef.current.toDataURL('image/png')
    onConfirm(payload)
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Proof of Delivery"
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit} disabled={!canSubmit()}>
            Confirm Delivered
          </Button>
        </>
      }
    >
      {delivery && (
        <div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Confirm delivery for <strong>{delivery.delivery_number}</strong>
            {delivery.customers?.name && <> — {delivery.customers.name}</>}
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, minWidth: 90, padding: '8px 10px', borderRadius: 9,
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--card-border)'}`,
                    background: active ? '#fff7ed' : 'var(--card-bg)',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
          </div>

          {tab === 'checkbox' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'var(--content-bg)', borderRadius: 10, cursor: 'pointer', fontSize: 13.5 }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              <span>I confirm this order was delivered to the customer</span>
            </label>
          )}

          {tab === 'signature' && (
            <div>
              <canvas
                ref={canvasRef}
                width={360}
                height={160}
                style={{ width: '100%', height: 160, border: '1.5px dashed var(--card-border)', borderRadius: 10, background: '#fff', touchAction: 'none', cursor: 'crosshair' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <button onClick={clearSignature} style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Clear signature
              </button>
            </div>
          )}

          {tab === 'photo' && (
            <div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                style={{ display: 'block', width: '100%', padding: '10px', border: '1.5px dashed var(--card-border)', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: 'var(--content-bg)' }}
              />
              {photoFile && (
                <img src={URL.createObjectURL(photoFile)} alt="proof" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover', marginTop: 12 }} />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default ProofOfDeliveryModal
