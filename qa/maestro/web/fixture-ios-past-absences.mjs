import { API_BASE, WEB_BASE } from "./config.mjs";
// Adds two past sessions (held) to QA-iOS-B with the first student absent in both, for the two-consecutive-absences warning. API only; credentials come from ~/.config/qlh/dev-qa.txt and are never printed.
// Usage: node qa/maestro/web/fixture-ios-past-absences.mjs (run once; a second run only re-sends the same absences)
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const api=API_BASE;
const cls='fcf97253-9beb-4fab-9cc7-32e881afd174';
const c=Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`,'utf8')).split('\n').filter(Boolean).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));
const call=async(m,p,b,t)=>{const r=await fetch(api+p,{method:m,headers:{'content-type':'application/json',...(t?{authorization:`Bearer ${t}`}:{})},body:b?JSON.stringify(b):undefined});return [r.status,await r.json().catch(()=>null)]};
const [,l]=await call('POST','/auth/login',{phone:c.phone,password:c.password,device_label:'qa-fixture'});
const t=l.token;
const mem=l.membership_id??l.memberships?.[0]?.id??l.user?.memberships?.[0]?.id;
console.log('login keys',Object.keys(l).join(','),'mem',!!mem);
await call('POST',`/classes/${cls}/sessions`,{id:randomUUID(),date:'2026-10-22',start_time:'21:00',is_makeup:false,note:''},t);
const [,ss]=await call('GET',`/classes/${cls}/sessions?from=2026-10-01&to=2026-10-26`,null,t);
const list=ss.items??ss.sessions??ss;
console.log('past sessions',list.map(s=>`${s.date}:${s.status}`).join(' '));
const [,st]=await call('GET',`/classes/${cls}/students`,null,t);
const sid=(st.items??st.students??st)[0].id;
const cmds=list.filter(s=>s.date<'2026-10-27').map(s=>({id:randomUUID(),type:'attendance.set',base_version:0,created_at:new Date().toISOString(),payload:{session_id:s.id,student_id:sid,status:'absent',note:''}}));
const [s,j]=await call('POST','/sync/push',{membership_id:mem,device_id:randomUUID(),commands:cmds},t);
console.log(s,JSON.stringify((j?.results??j?.error??[]).map?.(r=>r.status+(r.error?':'+r.error.code:''))??j?.error?.code));
const [,after]=await call('GET',`/classes/${cls}/sessions?from=2026-10-01&to=2026-10-26`,null,t);
console.log('after',(after.items??after.sessions??after).map(s=>`${s.date}:${s.status}`).join(' '));
