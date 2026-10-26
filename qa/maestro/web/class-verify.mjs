import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const values=Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`,'utf8')).split(/\r?\n/).map(line=>{const i=line.indexOf('=');return i>0?[line.slice(0,i).trim(),line.slice(i+1).trim()]:['',''];}).filter(([key])=>key));
const out='plans/20261021-mvp/qa/runs/2026-10-24/web';await mkdir(out,{recursive:true});const cases=[];
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
async function check(id,fn){try{await fn();cases.push([id,'PASS']);console.log('PASS',id);}catch(error){cases.push([id,'FAIL']);console.log('FAIL',id,error instanceof Error?error.message:'unknown');}}
try{
 await page.goto('https://qlh-staging-web.pages.dev/dang-nhap');await page.locator('input').first().fill(values.phone);await page.locator('input[type=password]').fill(values.password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(/\/lop(?:\/|$)/,{timeout:15000});await page.goto('https://qlh-staging-web.pages.dev/lop');
 await page.getByRole('link',{name:/QA-Web-241025B-Class/}).last().click();await page.waitForURL(/\/lop\/[^/]+/);
 await check('TC-CLS-015',async()=>{for(const label of ['Buổi học','Bài kiểm tra','Điểm','Học sinh','Báo cáo'])if(await page.getByRole('link',{name:label,exact:true}).count()===0)throw new Error(`missing tab ${label}`);});
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-class-tabs" tests="${cases.length}" failures="${cases.filter(x=>x[1]==='FAIL').length}">${cases.map(([id,result])=>`<testcase classname="web" name="${id}">${result==='FAIL'?'<failure message="assertion failed"/>':''}</testcase>`).join('')}</testsuite>\n`;await writeFile(`${out}/class-verify-junit.xml`,xml);
 if(cases.some(x=>x[1]==='FAIL'))process.exitCode=1;
}finally{await browser.close();}
