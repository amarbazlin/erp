import React from 'react'
import { Calendar, X, Filter } from 'lucide-react'
import { formatRangeLabel } from '../../utils/dateRange'
import Button from './Button'

/**
 * Collapsible start/end date filter for list pages.
 */
const DateRangeFilter = ({
  open,
  onToggle,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onApply,
  onClear,
  isActive,
  appliedStart,
  appliedEnd,
}) => (
  <div className="date-range-filter">
    <button
      type="button"
      className={`date-range-filter-btn ${isActive ? 'active' : ''}`}
      onClick={onToggle}
      aria-expanded={open}
    >
      <Filter size={14} />
      <span>{isActive ? formatRangeLabel(appliedStart, appliedEnd) : 'Filter by date'}</span>
      {isActive && (
        <span
          className="date-range-clear-chip"
          onClick={(e) => { e.stopPropagation(); onClear() }}
          role="button"
          tabIndex={0}
          aria-label="Clear date filter"
        >
          <X size={12} />
        </span>
      )}
    </button>

    {open && (
      <>
      <div className="date-range-backdrop" onClick={onToggle} aria-hidden="true" />
      <div className="date-range-panel card">
        <div className="date-range-panel-header">
          <Calendar size={15} color="var(--accent)" />
          <span>Filter by period</span>
        </div>
        <div className="date-range-fields">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Start date</label>
            <input
              type="date"
              className="input-base"
              value={startDate}
              max={endDate || undefined}
              onChange={e => onStartChange(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>End date</label>
            <input
              type="date"
              className="input-base"
              value={endDate}
              min={startDate || undefined}
              onChange={e => onEndChange(e.target.value)}
            />
          </div>
        </div>
        <div className="date-range-actions">
          <Button variant="secondary" size="sm" onClick={onClear}>Clear</Button>
          <Button size="sm" onClick={onApply}>Apply filter</Button>
        </div>
      </div>
      </>
    )}
  </div>
)

export default DateRangeFilter
