import { useState, useEffect } from 'react'

const getBreakpoint = () => {
  const w = window.innerWidth
  return {
    isMobile:  w <= 768,
    isTablet:  w > 768 && w <= 1024,
    isDesktop: w > 1024,
    width: w,
  }
}

/** Shared responsive breakpoint hook — mobile ≤768, tablet ≤1024 */
export const useBreakpoint = () => {
  const [bp, setBp] = useState(getBreakpoint)

  useEffect(() => {
    const handler = () => setBp(getBreakpoint())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return bp
}

export default useBreakpoint
