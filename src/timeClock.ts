export type TimeEntryStatus = 'working' | 'on-break' | 'completed' | 'missing-clock-out'

export interface BreakEntry {
  id: string
  timeEntryId: string
  startedAt: string
  endedAt: string | null
  paid: boolean | null
}

export interface TimeEntryAdjustment {
  id: string
  timeEntryId: string
  field: 'clockInAt' | 'clockOutAt' | 'breakStartedAt' | 'breakEndedAt'
  breakEntryId?: string
  originalValue: string | null
  correctedValue: string | null
  changedByEmployeeId: number
  changedAt: string
  reason?: string
}

export interface TimeApproval {
  id: string
  timeEntryId: string
  approvedMinutes: number
  approvedByEmployeeId: number
  approvedAt: string
  note?: string
}

export interface TimeEntry {
  id: string
  businessId: string
  locationId: string
  employeeId: number
  scheduledShiftId: string
  scheduledDate: string
  shiftTemplateId: string
  scheduledStartAt: string
  scheduledEndAt: string
  clockInAt: string
  clockOutAt: string | null
  breaks: BreakEntry[]
  adjustments: TimeEntryAdjustment[]
  approval?: TimeApproval
  status: TimeEntryStatus
}

export interface TimeEntryException {
  lateClockInMinutes: number
  earlyClockOutMinutes: number
  pastScheduledEndMinutes: number
  missedClockOut: boolean
}

export interface OvertimeRule {
  id: string
  name: string
  thresholdMinutes: number
  period: 'day' | 'week'
  active: boolean
}

/** Policy is business-owned; the time clock only supplies exact worked minutes. */
export interface TimePolicy {
  unspecifiedBreakIsPaid: boolean
  overtimeRules: OvertimeRule[]
}

export const demoTimePolicy: TimePolicy = { unspecifiedBreakIsPaid: false, overtimeRules: [] }

const minuteMs = 60_000
export const minutesBetween = (start: string, end: string): number =>
  Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / minuteMs))

export function scheduledMinutes(entry: TimeEntry): number {
  return minutesBetween(entry.scheduledStartAt, entry.scheduledEndAt)
}

export function breakMinutes(entry: TimeEntry, now = new Date().toISOString(), policy: TimePolicy = demoTimePolicy): number {
  return entry.breaks.reduce((total, item) => {
    const isPaid = item.paid ?? policy.unspecifiedBreakIsPaid
    return total + (isPaid ? 0 : minutesBetween(item.startedAt, item.endedAt ?? now))
  }, 0)
}

export function actualWorkedMinutes(entry: TimeEntry, now = new Date().toISOString(), policy: TimePolicy = demoTimePolicy): number {
  return Math.max(0, minutesBetween(entry.clockInAt, entry.clockOutAt ?? now) - breakMinutes(entry, now, policy))
}

export function differenceMinutes(entry: TimeEntry, now = new Date().toISOString()): number {
  return actualWorkedMinutes(entry, now) - scheduledMinutes(entry)
}

export function timeEntryExceptions(entry: TimeEntry, now = new Date().toISOString()): TimeEntryException {
  const end = entry.clockOutAt ?? now
  return {
    lateClockInMinutes: Math.max(0, minutesBetween(entry.scheduledStartAt, entry.clockInAt)),
    earlyClockOutMinutes: entry.clockOutAt && new Date(entry.clockOutAt) < new Date(entry.scheduledEndAt)
      ? minutesBetween(entry.clockOutAt, entry.scheduledEndAt) : 0,
    pastScheduledEndMinutes: !entry.clockOutAt && new Date(now) > new Date(entry.scheduledEndAt)
      ? minutesBetween(entry.scheduledEndAt, end) : 0,
    missedClockOut: entry.status === 'missing-clock-out',
  }
}

export function formatMinutes(total: number, includeSign = false): string {
  const sign = includeSign ? (total > 0 ? '+' : total < 0 ? '−' : '') : ''
  const absolute = Math.abs(total)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `${sign}${hours ? `${hours}h ` : ''}${String(minutes).padStart(hours ? 2 : 1, '0')}m`
}

export function clockIn(entry: Omit<TimeEntry, 'clockInAt'|'clockOutAt'|'breaks'|'adjustments'|'status'>, timestamp: string): TimeEntry {
  return { ...entry, clockInAt: timestamp, clockOutAt: null, breaks: [], adjustments: [], status: 'working' }
}

export function clockOut(entry: TimeEntry, timestamp: string): TimeEntry {
  const breaks = entry.breaks.map(item => item.endedAt ? item : { ...item, endedAt: timestamp })
  return { ...entry, breaks, clockOutAt: timestamp, status: 'completed' }
}

export function startBreak(entry: TimeEntry, timestamp: string): TimeEntry {
  if (entry.status !== 'working') return entry
  const item: BreakEntry = { id: `break-${entry.id}-${entry.breaks.length + 1}`, timeEntryId: entry.id, startedAt: timestamp, endedAt: null, paid: null }
  return { ...entry, breaks: [...entry.breaks, item], status: 'on-break' }
}

export function endBreak(entry: TimeEntry, timestamp: string): TimeEntry {
  if (entry.status !== 'on-break') return entry
  return { ...entry, breaks: entry.breaks.map(item => item.endedAt ? item : { ...item, endedAt: timestamp }), status: 'working' }
}

export function adjustTimeEntry(entry: TimeEntry, adjustment: Omit<TimeEntryAdjustment, 'id'|'timeEntryId'|'originalValue'>): TimeEntry {
  let originalValue: string | null
  let updated: TimeEntry
  if (adjustment.field === 'clockInAt' || adjustment.field === 'clockOutAt') {
    originalValue = entry[adjustment.field]
    updated = { ...entry, [adjustment.field]: adjustment.correctedValue }
  } else {
    const key = adjustment.field === 'breakStartedAt' ? 'startedAt' : 'endedAt'
    const target = entry.breaks.find(item => item.id === adjustment.breakEntryId)
    originalValue = target?.[key] ?? null
    updated = { ...entry, breaks: entry.breaks.map(item => item.id === adjustment.breakEntryId ? { ...item, [key]: adjustment.correctedValue } : item) }
  }
  const audit: TimeEntryAdjustment = { ...adjustment, id: `adjustment-${entry.id}-${entry.adjustments.length + 1}`, timeEntryId: entry.id, originalValue }
  return { ...updated, adjustments: [...entry.adjustments, audit] }
}

export function approveTime(entry: TimeEntry, approval: Omit<TimeApproval, 'id'|'timeEntryId'>): TimeEntry {
  return { ...entry, approval: { ...approval, id: `approval-${entry.id}`, timeEntryId: entry.id } }
}

export function weeklyActualMinutes(entries: TimeEntry[], weekStart: string, businessId: string, locationId: string, now?: string): Record<number, number> {
  const start = new Date(`${weekStart}T00:00:00Z`), end = new Date(start); end.setUTCDate(end.getUTCDate() + 7)
  const totals: Record<number, number> = {}
  entries.filter(item => item.businessId === businessId && item.locationId === locationId && new Date(item.scheduledDate) >= start && new Date(item.scheduledDate) < end)
    .forEach(item => { totals[item.employeeId] = (totals[item.employeeId] ?? 0) + actualWorkedMinutes(item, now) })
  return totals
}

export function entriesForScope(entries: TimeEntry[], businessId: string, locationIds: string[]): TimeEntry[] {
  return entries.filter(entry => entry.businessId === businessId && locationIds.includes(entry.locationId))
}

export const demoTimeEntries: TimeEntry[] = [
  {
    id: 'time-2026-10-05-marcus-evening', businessId: 'business-1', locationId: 'location-1', employeeId: 2,
    scheduledShiftId: '2026-10-05-evening', scheduledDate: '2026-10-05', shiftTemplateId: 'evening',
    scheduledStartAt: '2026-10-05T15:00:00-04:00', scheduledEndAt: '2026-10-05T23:00:00-04:00',
    clockInAt: '2026-10-05T15:03:00-04:00', clockOutAt: '2026-10-05T23:17:00-04:00',
    breaks: [{ id: 'break-marcus-1', timeEntryId: 'time-2026-10-05-marcus-evening', startedAt: '2026-10-05T19:03:00-04:00', endedAt: '2026-10-05T19:33:00-04:00', paid: null }],
    adjustments: [], status: 'completed',
  },
  {
    id: 'time-2026-10-05-sarah-day', businessId: 'business-1', locationId: 'location-1', employeeId: 1,
    scheduledShiftId: '2026-10-05-day', scheduledDate: '2026-10-05', shiftTemplateId: 'day',
    scheduledStartAt: '2026-10-05T07:00:00-04:00', scheduledEndAt: '2026-10-05T15:00:00-04:00',
    clockInAt: '2026-10-05T06:58:00-04:00', clockOutAt: '2026-10-05T15:32:00-04:00', breaks: [], adjustments: [], status: 'completed',
  },
]
