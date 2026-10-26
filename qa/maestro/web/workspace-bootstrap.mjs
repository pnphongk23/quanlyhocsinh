import { mkdir, writeFile } from 'node:fs/promises';
import { randomInt, randomBytes } from 'node:crypto';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const out='plans/20261021-mvp/qa/runs/2026-10-24/web'; await mkdir(out,{recursive:true});
const phone=String(randomInt(700000000,999999999)); const password=randomBytes(12).toString('base64url')+'A1';
const className='QA-Web-241025A-Class'; const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1440,height:900}}); const cases=[];
async function check(id,fn){try{await fn();cases.push([id,'PASS']);console.log('PASS',id);}catch(e){cases.push([id,'FAIL']);console.log('FAIL',id,e instanceof Error?e.message:'unknown');}}
try{
 await page.goto('https://qlh-staging-web.pages.dev/dang-nhap',{waitUntil:'domcontentloaded'}); await page.getByRole('link',{name:/Tạo tài khoản/}).click(); await page.getByLabel('Tên hiển thị').fill('QA-Web-Smoke'); await page.getByLabel('Tên không gian làm việc').fill('smoke-qa-prm'); await page.locator('input').first().fill(phone); await page.locator('input[type=password]').nth(0).fill(password); await page.locator('input[type=password]').nth(1).fill(password); await page.getByRole('button',{name:'Tạo không gian làm việc',exact:true}).click(); await page.waitForURL(/\/lop(?:\/|$)/,{timeout:20000});
 await check('TC-AUTH-001',async()=>{const body=await page.locator('body').innerText();if(!body.includes('Tất cả lớp')&&!body.includes('Lớp của tôi'))throw new Error('teacher did not land on class home');if(body.includes('Tên không gian làm việc'))throw new Error('registration form still visible');});
 await page.goto('https://qlh-staging-web.pages.dev/lop/moi'); await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(className); await page.getByRole('button',{name:'T2',exact:true}).click(); await page.getByRole('button',{name:'T5',exact:true}).click(); await page.locator('input[type=time]').fill('18:00'); await page.getByRole('button',{name:'Tạo lớp',exact:true}).click(); await page.getByText('Đã lưu',{exact:true}).waitFor({timeout:10000});
 await check('TC-CLS-001',async()=>{if(!await page.getByRole('button',{name:/QA-Web-241025A-Class/}).count())throw new Error('created class not selected');});
 await page.goto('https://qlh-staging-web.pages.dev/lop'); const card=page.getByRole('link',{name:new RegExp(className)}); await card.waitFor({timeout:10000}); await card.click(); await page.waitForURL(/\/lop\/[^/]+/);
 await check('TC-CLS-015',async()=>{for(const label of ['Buổi học','Bài kiểm tra','Điểm','Học sinh','Báo cáo'])if(await page.getByRole('link',{name:label,exact:true}).count()===0)throw new Error(`missing tab ${label}`);});
 await page.getByRole('link',{name:'Buổi học',exact:true}).click();
 await check('TC-CLS-006',async()=>{const body=await page.locator('body').innerText();if(!/Buổi\s*1/.test(body)||!/Buổi\s*2/.test(body))throw new Error('expected numbered generated sessions 1 and 2');});
 const rows=await page.getByRole('link').allTextContents({timeoutMs:3000}); console.log('SESSION_LINK_COUNT',rows.length);
 const report=`<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="web-bootstrap" tests="${cases.length}" failures="${cases.filter(x=>x[1]==='FAIL').length}">${cases.map(([id,result])=>`<testcase classname="web" name="${id}">${result==='FAIL'?'<failure message="assertion failed"/>':''}</testcase>`).join('')}</testsuite>\n`;
 await writeFile(`${out}/bootstrap-junit.xml`,report);
 if(cases.some(x=>x[1]==='FAIL'))process.exitCode=1;
} finally {await browser.close();}
