import { API_BASE, WEB_BASE } from "./config.mjs";
import { readFile } from 'node:fs/promises';
import { chromium } from '/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/node_modules/playwright/index.mjs';
const values = Object.fromEntries((await readFile(`${process.env.HOME}/.config/qlh/dev-qa.txt`,'utf8')).split(/\r?\n/).map(line=>{const i=line.indexOf('=');return i>0?[line.slice(0,i).trim(),line.slice(i+1).trim()]:['',''];}).filter(([k])=>k));
const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1440,height:900}});
try {
 await page.goto(WEB_BASE + '/dang-nhap',{waitUntil:'domcontentloaded'});
 await page.locator('input').first().fill(values.phone); await page.locator('input[type=password]').fill(values.password); await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.waitForURL(/\/lop(?:\/|$)/,{timeout:15000});
 await page.goto(WEB_BASE + '/lop/moi',{waitUntil:'domcontentloaded'}); await page.getByRole('heading',{name:/tạo lớp|thêm lớp/i}).waitFor({timeout:10000});
 console.log('PAGE', (await page.locator('body').innerText()).slice(0,1000));
 console.log('FIELDS',JSON.stringify(await page.locator('input,textarea,select,button').evaluateAll(xs=>xs.map(x=>({tag:x.tagName, type:x.type||'', placeholder:x.getAttribute('placeholder'), aria:x.getAttribute('aria-label'), name:x.getAttribute('name'), text:(x.innerText||'').trim().slice(0,70)})))));
} finally {await browser.close();}
