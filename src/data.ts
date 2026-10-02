export type Employee = {
  id: number
  name: string
  initials: string
  email: string
  role: string
  shift: string
  eligibleShifts: ShiftType[]
  target: number
  color: string
  active: boolean
}

export type ShiftType = 'Day' | 'Evening' | 'Night Audit'

export type Shift = {
  type: ShiftType
  time: string
  employee: number | null
  open?: boolean
  reason?: string
  normalEmployee?: number
  replacement?: boolean
}

export type Schedule = Record<string, Shift[]>

export type ScheduleOverride = {
  date: string
  shift: ShiftType
  unavailableEmployee: number
  reason: 'Approved time off' | 'Sick leave' | 'Manual adjustment'
  replacementEmployee: number | null
  /** When true, the employee is unavailable for every shift on this date. */
  allDay?: boolean
}

export const employees: Employee[] = [
  { id: 1, name: 'Sarah Mitchell', initials: 'SM', email: 'sarah@example.com', role: 'Front Desk', shift: 'Day', eligibleShifts: ['Day', 'Evening'], target: 40, color: '#DCECE6', active: true },
  { id: 2, name: 'Marcus Johnson', initials: 'MJ', email: 'marcus@example.com', role: 'Front Desk', shift: 'Evening', eligibleShifts: ['Day', 'Evening'], target: 40, color: '#E6E1F2', active: true },
  { id: 3, name: 'Elena Rodriguez', initials: 'ER', email: 'elena@example.com', role: 'Night Auditor', shift: 'Night Audit', eligibleShifts: ['Night Audit'], target: 40, color: '#F5E4D2', active: true },
  { id: 4, name: 'James Kim', initials: 'JK', email: 'james@example.com', role: 'Front Desk', shift: 'Day', eligibleShifts: ['Day', 'Evening'], target: 24, color: '#DDE8F4', active: true },
  { id: 5, name: 'Nina Patel', initials: 'NP', email: 'nina@example.com', role: 'Housekeeping', shift: 'Day', eligibleShifts: ['Day'], target: 32, color: '#F3DFE5', active: true },
]

export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// The permanent repeating template. Date-specific events must never be written here.
export const baseSchedule: Schedule = Object.fromEntries(days.map((day, index) => [day, [
  { type: 'Day', time: '7:00 AM – 3:00 PM', employee: index === 5 ? 4 : 1 },
  { type: 'Evening', time: '3:00 PM – 11:00 PM', employee: 2 },
  { type: 'Night Audit', time: '11:00 PM – 7:00 AM', employee: 3 },
]]))

export const initialOverrides: ScheduleOverride[] = [{
  date: '2026-10-09',
  shift: 'Day',
  unavailableEmployee: 1,
  reason: 'Approved time off',
  replacementEmployee: null,
  allDay: true,
}]

export function isEmployeeUnavailable(
  employeeId: number,
  date: string,
  shift: ShiftType,
  overrides: ScheduleOverride[],
): boolean {
  return overrides.some(item =>
    item.date === date &&
    item.unavailableEmployee === employeeId &&
    item.reason !== 'Manual adjustment' &&
    (item.allDay === true || item.shift === shift),
  )
}

/** Return only employees who may be newly assigned to this dated shift. */
export function getAvailableEmployees(
  employeeList: Employee[],
  shift: ShiftType,
  date?: string,
  overrides: ScheduleOverride[] = [],
): Employee[] {
  return employeeList.filter(employee =>
    employee.active &&
    employee.eligibleShifts.includes(shift) &&
    (!date || !isEmployeeUnavailable(employee.id, date, shift, overrides)),
  )
}

/** Materialize any week without changing the repeating base template. */
export function createWeeklySchedule(overrides: ScheduleOverride[], weekStart = '2026-10-05', template = baseSchedule): Schedule {
  const start = new Date(`${weekStart}T00:00:00Z`)
  return Object.fromEntries(days.map((day, index) => [day, template[day].map(baseShift => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    const dateKey = date.toISOString().slice(0, 10)
    const override = overrides.find(item => item.date === dateKey && item.shift === baseShift.type && item.unavailableEmployee === baseShift.employee)
    if (!override) return { ...baseShift }
    return {
      ...baseShift,
      employee: override.replacementEmployee,
      normalEmployee: baseShift.employee ?? undefined,
      open: override.replacementEmployee === null,
      reason: override.reason,
      replacement: override.replacementEmployee !== null,
    }
  })]))
}

export function calculateWeeklyHours(schedule: Schedule): Record<number, number> {
  const totals: Record<number, number> = {}
  days.forEach(day => schedule[day].forEach(shift => {
    if (shift.employee !== null) totals[shift.employee] = (totals[shift.employee] ?? 0) + 8
  }))
  return totals
}
