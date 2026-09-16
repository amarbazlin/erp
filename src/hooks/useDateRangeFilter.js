import { useState, useCallback, useMemo } from 'react'
import { daysAgoStr, todayStr, toApiRange } from '../utils/dateRange'

/**
 * Manages draft vs applied date range for table filters.
 * @param {{ defaultDays?: number }} options - default lookback when applying first time
 */
export const useDateRangeFilter = ({ defaultDays = 30 } = {}) => {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(daysAgoStr(defaultDays))
  const [draftEnd, setDraftEnd]     = useState(todayStr())
  const [applied, setApplied]       = useState(null) // null = no filter active

  const isActive = Boolean(applied?.startDate && applied?.endDate)

  const apiParams = useMemo(
    () => (isActive ? toApiRange(applied) : {}),
    [isActive, applied]
  )

  const apply = useCallback(() => {
    if (!draftStart || !draftEnd) return
    if (draftStart > draftEnd) {
      alert('Start date must be before end date')
      return
    }
    setApplied({ startDate: draftStart, endDate: draftEnd })
    setOpen(false)
  }, [draftStart, draftEnd])

  const clear = useCallback(() => {
    setApplied(null)
    setDraftStart(daysAgoStr(defaultDays))
    setDraftEnd(todayStr())
    setOpen(false)
  }, [defaultDays])

  const openPanel = useCallback(() => {
    if (applied) {
      setDraftStart(applied.startDate)
      setDraftEnd(applied.endDate)
    }
    setOpen(o => !o)
  }, [applied])

  return {
    open,
    draftStart,
    draftEnd,
    setDraftStart,
    setDraftEnd,
    applied,
    isActive,
    apiParams,
    apply,
    clear,
    openPanel,
    setOpen,
  }
}

export default useDateRangeFilter
