import React, { useEffect } from 'react'
import { X } from 'lucide-react'

const Modal = ({ open, onClose, title, children, width = 520, footer }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-overlay" style={styles.overlay} onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ ...styles.modal, width, maxWidth: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer" style={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(13,17,23,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(3px)',
    animation: 'fadeIn 0.15s ease',
    padding: '16px',
  },
  modal: {
    background: 'var(--card-bg)',
    borderRadius: 16,
    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
    border: '1px solid var(--card-border)',
    animation: 'slideIn 0.2s ease',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--card-border)',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: '1px solid var(--card-border)',
    background: 'var(--content-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
    WebkitOverflowScrolling: 'touch',
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid var(--card-border)',
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
}

export default Modal
