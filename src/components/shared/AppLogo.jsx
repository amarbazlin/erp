import React from 'react'

// Bundled via Vite for reliable loading on iOS Safari (root-relative paths can 404 in SPA builds)
import logoSrc from '../../assets/logo.png'

const AppLogo = ({ size = 30, style = {}, className = '' }) => (
  <img
    src={logoSrc}
    alt="Forgera OS"
    width={size}
    height={size}
    className={`app-logo ${className}`}
    style={{
      width: size,
      height: size,
      objectFit: 'contain',
      display: 'block',
      flexShrink: 0,
      ...style,
    }}
    decoding="async"
    draggable={false}
  />
)

export default AppLogo
