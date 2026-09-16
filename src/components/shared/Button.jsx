import React from 'react'
import Loader from './Loader'

const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, #f97316, #ea6c00)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
  },
  secondary: {
    background: 'var(--card-bg)',
    color: 'var(--text-secondary)',
    border: '1.5px solid var(--card-border)',
  },
  danger: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: '1.5px solid #fecaca',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
  },
  success: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
    border: '1.5px solid #bbf7d0',
  },
}

const SIZES = {
  sm: { padding: '6px 12px', fontSize: 12, borderRadius: 7 },
  md: { padding: '9px 18px', fontSize: 13.5, borderRadius: 9 },
  lg: { padding: '11px 24px', fontSize: 14, borderRadius: 10 },
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  onClick,
  type = 'button',
  style = {},
  fullWidth = false,
}) => {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary
  const sizeStyle = SIZES[size] || SIZES.md

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.15s ease',
        width: fullWidth ? '100%' : 'auto',
        outline: 'none',
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
    >
      {loading ? (
        <Loader size={14} color={variant === 'primary' ? '#fff' : 'var(--accent)'} />
      ) : icon ? (
        React.cloneElement(icon, { size: size === 'sm' ? 13 : 15, strokeWidth: 2 })
      ) : null}
      {children}
    </button>
  )
}

export default Button
