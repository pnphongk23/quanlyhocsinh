"""Existing Python Playwright + installed Chromium; isolated, no persistent profile.
Run from repository root: python3 plans/20261021-mvp/design/mascot/evidence/capture.py
Existing Vite at 127.0.0.1:5173 is not owned by this script.
"""
from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=r"""async ({scenario,route})=>{
 const {createSeed}=await import('/src/data/seed.ts');
 const s=createSeed();
 // All fixtures originate from seed in this fresh context, then replace identifying/free text.
 const scrub=(o)=>{if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){
 if(['phone','parentPhone'].includes(k))o[k]='';
 else if(['note','generalComment','description','reason'].includes(k))o[k]='';
 else if(k==='name'&&typeof o[k]==='string')o[k]='Mẫu thử';
 else scrub(o[k]);}};scrub(s);
 s.classes.forEach((x,i)=>x.name='Lớp mẫu '+(i+1));
 const student=s.students.find(x=>x.classId==='6a');student.name='Học sinh mẫu';student.status='active';student.enrolledAt='2026-09-01';student.leftAt=null;
 s.students=[student];s.members.forEach(x=>{x.name='Người dùng mẫu';if(x.studentIds)x.studentIds=[student.id]});
 s.currentClassId='6a';s.pending=[];s.changeLogs=[];
 const member=s.members.find(x=>x.roleId===(scenario==='overview'||scenario==='published'?'role-guardian':'role-admin'));
 s.auth={phone:'999000001',memberIds:[member.id]};s.activeMemberId=member.id;
 s.comments=[];s.homeworkSections=[];s.homeworkGrades=[];
 s.reports=[];s.tests=[];s.scores=[];
 if(scenario==='empty')s.students=[];
 if(scenario==='error')s.attendance=[];
 const session=s.sessions.find(x=>x.id==='6a-session-0');
 if(scenario==='sent')s.comments=[{id:'fixture-ticket',classId:'6a',studentId:student.id,sessionId:session.id,stars:3,note:'',status:'sent',sendQueued:false,sentAt:'2026-09-21T12:00:00Z',createdAt:'2026-09-21T12:00:00Z',updatedAt:'2026-09-21T12:00:00Z'}];
 if(scenario==='published')s.reports=[{id:'fixture-report',classId:'6a',studentId:student.id,month:'2026-09',status:'published',needsRepublish:false,generalComment:'',publishedAt:'2026-10-01T12:00:00Z'}];
 if(scenario==='login')s.auth=null;
 return s;
}"""
SCENES=[('login','/dang-nhap'),('empty','/lop/6a/hoc-sinh'),('sent','/lop/6a/buoi-hoc/6a-session-0?tab=nhan-xet'),('overview','/ph'),('published','/ph/bao-cao'),('error','/lop/6a/buoi-hoc/6a-session-0')]
