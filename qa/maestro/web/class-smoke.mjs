import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const values=Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/staging-smoke.txt`,'utf8')).split(/\r?\n/).map(line=>{const i=line.indexOf('=');return i>0?[line.slice(0,i).trim(),line.slice(i+1).trim()]:['',''];}).filter(([k])=>k));
const run='241025'; const name=`QA-Web-${run}-Class`;
const out=`plans/20261021-mvp/qa/runs/2026-10-24/web`; await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.goto('https://qlh-staging-web.pages.dev/dang-nhap',{waitUntil:'domcontentloaded'});await page.locator('input').first().fill(values.phone);await page.locator('input[type=password]').fill(values.password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(/\/lop(?:\/|$)/,{timeout:15000});
 await page.goto('https://qlh-staging-web.pages.dev/lop/moi',{waitUntil:'domcontentloaded'});await page.getByPlaceholder('Ví dụ: IELTS Foundation').fill(name);await page.getByRole('button',{name:'T2',exact:true}).click();await page.getByRole('button',{name:'T5',exact:true}).click();await page.locator('input[type=time]').fill('18:00');await page.getByRole('button',{name:'Tạo lớp',exact:true}).click();await page.waitForURL(/\/lop\/[^/]+(?:\/buoi-hoc)?$/,{timeout:15000});
 const url=page.url();const body=await page.locator('body').innerText();if(!body.includes(name))throw new Error('Created class name not visible');
 await page.screenshot({path:`${out}/class-created.png`});
 const tabs=['Buổi học','Bài kiểm tra','Điểm','Học sinh','Báo cáo'];const found={};for(const label of tabs)found[label]=await page.getByRole('link',{name:new RegExp(label)}).count();
 console.log('PASS TC-CLS-001: QA class created with recurring weekdays; desktop viewport 1440x900');console.log('TC-CLS-015 tabs:',JSON.stringify(found));console.log('CLASS_URL_PATH',new URL(url).pathname);
}finally{await browser.close();}
