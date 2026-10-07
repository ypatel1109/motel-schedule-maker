export type WeekStart = 'Sunday' | 'Monday'

export interface Business {
  id: string
  name: string
  businessType: 'Hotel / Motel' | 'Restaurant' | 'Retail' | 'Healthcare' | 'Office' | 'Other'
  timeZone: string
  weekStartsOn: WeekStart
}

export interface Location { id: string; businessId: string; name: string }
export interface Role { id: string; name: string; active: boolean }
export interface ShiftTemplate { id: string; name: string; startTime: string; endTime: string; active: boolean; displayOrder: number }

export interface Employee {
  id: number
  locationId: string
  name: string
  initials: string
  email: string
  roleId: string
  eligibleShiftIds: string[]
  target: number
  color: string
  active: boolean
}

export interface BaseAssignment { shiftTemplateId: string; employeeId: number | null }
export type BaseSchedule = Record<string, BaseAssignment[]>
export type AbsenceReason = 'Approved time off' | 'Sick leave' | 'Unavailable' | 'Manual adjustment'
export interface ScheduleOverride {
  id: string
  date: string
  shiftTemplateId: string
  unavailableEmployeeId: number
  reason: AbsenceReason
  replacementEmployeeId: number | null
  allDay?: boolean
}
export interface TimeOff { id: string; employeeId: number; startDate: string; endDate: string; status: 'Pending'|'Approved'|'Denied'; reason: string }
export interface WeeklyShift extends BaseAssignment { date: string; open?: boolean; reason?: AbsenceReason; normalEmployeeId?: number; replacement?: boolean }
export type WeeklySchedule = Record<string, WeeklyShift[]>

export const businessTypes: Business['businessType'][] = ['Hotel / Motel','Restaurant','Retail','Healthcare','Office','Other']
export const initialBusiness: Business = { id:'business-1', name:'Seabreeze Motel', businessType:'Hotel / Motel', timeZone:'America/New_York', weekStartsOn:'Monday' }
export const initialLocation: Location = { id:'location-1', businessId:'business-1', name:'Main Motel' }
export const initialRoles: Role[] = [
  {id:'front-desk',name:'Front Desk',active:true},{id:'night-auditor',name:'Night Auditor',active:true},
  {id:'housekeeping',name:'Housekeeping',active:true},{id:'maintenance',name:'Maintenance',active:true},{id:'manager',name:'Manager',active:true},
]
export const initialShiftTemplates: ShiftTemplate[] = [
  {id:'day',name:'Day',startTime:'07:00',endTime:'15:00',active:true,displayOrder:0},
  {id:'evening',name:'Evening',startTime:'15:00',endTime:'23:00',active:true,displayOrder:1},
  {id:'night-audit',name:'Night Audit',startTime:'23:00',endTime:'07:00',active:true,displayOrder:2},
]
export const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export const employees: Employee[] = [
  {id:1,locationId:'location-1',name:'Sarah Mitchell',initials:'SM',email:'sarah@example.com',roleId:'front-desk',eligibleShiftIds:['day','evening'],target:40,color:'#DCECE6',active:true},
  {id:2,locationId:'location-1',name:'Marcus Johnson',initials:'MJ',email:'marcus@example.com',roleId:'front-desk',eligibleShiftIds:['day','evening'],target:40,color:'#E6E1F2',active:true},
  {id:3,locationId:'location-1',name:'Elena Rodriguez',initials:'ER',email:'elena@example.com',roleId:'night-auditor',eligibleShiftIds:['night-audit'],target:40,color:'#F5E4D2',active:true},
  {id:4,locationId:'location-1',name:'James Kim',initials:'JK',email:'james@example.com',roleId:'front-desk',eligibleShiftIds:['day','evening'],target:24,color:'#DDE8F4',active:true},
  {id:5,locationId:'location-1',name:'Nina Patel',initials:'NP',email:'nina@example.com',roleId:'housekeeping',eligibleShiftIds:['day'],target:32,color:'#F3DFE5',active:true},
]

export const baseSchedule: BaseSchedule = Object.fromEntries(days.map((day,index)=>[day,[
  {shiftTemplateId:'day',employeeId:index===5?4:1},{shiftTemplateId:'evening',employeeId:2},{shiftTemplateId:'night-audit',employeeId:3},
]]))
export const initialOverrides: ScheduleOverride[] = [{id:'override-oct9-sarah',date:'2026-10-09',shiftTemplateId:'day',unavailableEmployeeId:1,reason:'Approved time off',replacementEmployeeId:null,allDay:true}]

const minutes = (time:string) => { const [hour,minute]=time.split(':').map(Number); return hour*60+minute }
export function getShiftDuration(shift: Pick<ShiftTemplate,'startTime'|'endTime'>): number {
  const start=minutes(shift.startTime), end=minutes(shift.endTime)
  return ((end-start+1440)%1440 || 1440)/60
}
export function formatTime(time:string): string { const [rawHour,minute]=time.split(':').map(Number); return `${rawHour%12||12}:${String(minute).padStart(2,'0')} ${rawHour>=12?'PM':'AM'}` }
export function formatShiftTime(shift:ShiftTemplate): string { return `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}` }
export function isEmployeeUnavailable(employeeId:number,date:string,shiftTemplateId:string,overrides:ScheduleOverride[]):boolean {
  return overrides.some(item=>item.date===date&&item.unavailableEmployeeId===employeeId&&item.reason!=='Manual adjustment'&&(item.allDay||item.shiftTemplateId===shiftTemplateId))
}
export function shiftsOverlap(a:ShiftTemplate,b:ShiftTemplate):boolean {
  const ranges=(s:ShiftTemplate)=>{const start=minutes(s.startTime),end=minutes(s.endTime);return end<=start?[[start,1440],[0,end]]:[[start,end]]}
  return ranges(a).some(([as,ae])=>ranges(b).some(([bs,be])=>as<be&&bs<ae))
}
export function getAvailableEmployees(employeeList:Employee[],shiftTemplateId:string,date:string|undefined,overrides:ScheduleOverride[]=[],schedule?:WeeklySchedule,day?:string,templates:ShiftTemplate[]=initialShiftTemplates):Employee[] {
  const target=templates.find(s=>s.id===shiftTemplateId)
  if(!target?.active) return []
  return employeeList.filter(employee=>employee.active&&employee.eligibleShiftIds.includes(shiftTemplateId)&&(!date||!isEmployeeUnavailable(employee.id,date,shiftTemplateId,overrides))&&(!schedule||!day||!schedule[day].some(item=>item.employeeId===employee.id&&item.shiftTemplateId!==shiftTemplateId&&shiftsOverlap(target,templates.find(s=>s.id===item.shiftTemplateId)!))))
}
export function createWeeklySchedule(overrides:ScheduleOverride[],weekStart='2026-10-05',template:BaseSchedule=baseSchedule,shiftTemplates:ShiftTemplate[]=initialShiftTemplates):WeeklySchedule {
  const start=new Date(`${weekStart}T00:00:00Z`); const activeIds=new Set(shiftTemplates.filter(s=>s.active).map(s=>s.id))
  return Object.fromEntries(days.map((day,index)=>[day,(template[day]||[]).filter(base=>activeIds.has(base.shiftTemplateId)).map(base=>{
    const current=new Date(start); current.setUTCDate(start.getUTCDate()+index); const date=current.toISOString().slice(0,10)
    const override=overrides.find(item=>item.date===date&&item.shiftTemplateId===base.shiftTemplateId&&item.unavailableEmployeeId===base.employeeId)
    return override?{...base,date,employeeId:override.replacementEmployeeId,normalEmployeeId:base.employeeId??undefined,open:override.replacementEmployeeId===null,reason:override.reason,replacement:override.replacementEmployeeId!==null}:{...base,date}
  })]))
}
export function calculateWeeklyHours(schedule:WeeklySchedule,templates:ShiftTemplate[]=initialShiftTemplates):Record<number,number>{
  const totals:Record<number,number>={}; Object.values(schedule).flat().forEach(item=>{if(item.employeeId!==null){const shift=templates.find(s=>s.id===item.shiftTemplateId);if(shift)totals[item.employeeId]=(totals[item.employeeId]??0)+getShiftDuration(shift)}});return totals
}
export function getProjectedHours(employeeId:number,shiftTemplateId:string,schedule:WeeklySchedule,templates:ShiftTemplate[]=initialShiftTemplates):number {
  return (calculateWeeklyHours(schedule,templates)[employeeId]??0)+getShiftDuration(templates.find(s=>s.id===shiftTemplateId)!)
}
