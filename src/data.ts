export type Employee = { id:number; name:string; initials:string; email:string; role:string; shift:string; target:number; hours:number; color:string; active:boolean }
export type Shift = { type:'Day'|'Evening'|'Night Audit'; time:string; employee:number|null; open?:boolean; reason?:string }
export const employees: Employee[] = [
  {id:1,name:'Sarah Mitchell',initials:'SM',email:'sarah@example.com',role:'Front Desk',shift:'Day',target:40,hours:40,color:'#DCECE6',active:true},
  {id:2,name:'Marcus Johnson',initials:'MJ',email:'marcus@example.com',role:'Front Desk',shift:'Evening',target:40,hours:32,color:'#E6E1F2',active:true},
  {id:3,name:'Elena Rodriguez',initials:'ER',email:'elena@example.com',role:'Night Auditor',shift:'Night Audit',target:40,hours:40,color:'#F5E4D2',active:true},
  {id:4,name:'James Kim',initials:'JK',email:'james@example.com',role:'Front Desk',shift:'Day',target:24,hours:30,color:'#DDE8F4',active:true},
  {id:5,name:'Nina Patel',initials:'NP',email:'nina@example.com',role:'Housekeeping',shift:'Day',target:32,hours:24,color:'#F3DFE5',active:true},
]
export const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
export const schedule: Record<string,Shift[]> = Object.fromEntries(days.map((day,i)=>[day,[
  {type:'Day',time:'7:00 AM – 3:00 PM',employee:i===4?null:(i===5?4:1),open:i===4,reason:i===4?'Time off':undefined},
  {type:'Evening',time:'3:00 PM – 11:00 PM',employee:2},
  {type:'Night Audit',time:'11:00 PM – 7:00 AM',employee:3},
]]))
