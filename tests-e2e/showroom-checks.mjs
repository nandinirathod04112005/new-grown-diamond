import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const report=[];
if (!process.argv.includes('--preservation-only')) {
const browser=await chromium.launch();
try {
 for(const width of [320,768,1920]) for(const theme of ['dark','light']) {
  const p=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await p.addInitScript(t=>localStorage.setItem('ngd-theme',t),theme);
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:5173')?r.continue():r.abort());
  for(const path of ['/','/education','/contact','/login']) {
   await p.goto(`http://localhost:5173${path}`,{waitUntil:'domcontentloaded'});
   await p.locator('h1').first().waitFor();
   const state=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length}));
   report.push({width,theme,path,...state});
   assert.equal(state.overflow,false,`${path} ${width} ${theme} overflow`);
   assert.equal(state.h1,1);
  }
  await p.getByRole('button',{name:'Sign in',exact:true}).click();
  assert.ok(await p.locator('[aria-invalid="true"]').count());
  await p.goto('http://localhost:5173/education',{waitUntil:'domcontentloaded'});
  if(width<900) {
   const toggle=p.getByRole('button',{name:'Open menu'});
   await toggle.click();await p.keyboard.press('Escape');
   assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
  }
  await p.close();console.log(`PASS ${width}px ${theme}: layout, H1, invalid sign-in, mobile menu where applicable.`);
 }
 const p=await browser.newPage({viewport:{width:1440,height:900}});
 await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
 await p.keyboard.press('Escape');await p.waitForTimeout(1200);
 const layout=await p.locator('#top h1').evaluate(el=>({font:getComputedStyle(el.querySelector('em')).fontSize,columns:getComputedStyle(el.parentElement).gridTemplateColumns,imageWidth:el.parentElement.querySelector('img').getBoundingClientRect().width}));
 assert.ok(Number.parseFloat(layout.font)>60);
 assert.ok(layout.imageWidth<=580.5);
 await p.screenshot({path:'tests-e2e/showroom/after/home-1440-motion.png'});
 console.log('PASS actual imported hero styles:',JSON.stringify(layout));
 await p.emulateMedia({reducedMotion:'reduce'});
 await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
 for(const id of ['diamonds','precision','jewellery']) {
  const chapter=p.locator(`#${id}`);await chapter.scrollIntoViewIfNeeded();
  await chapter.locator('img').first().evaluate(async img=>{if(!img.complete)await new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;setTimeout(resolve,3000)});});
  await p.waitForTimeout(250);
  await p.screenshot({path:`tests-e2e/showroom/after/settled-${id}-1440.png`});
 }
 await p.close();
} finally {await browser.close();await fs.writeFile('tests-e2e/showroom/checks.json',JSON.stringify(report,null,2));}
}
const baseline=JSON.parse(await fs.readFile('tests-e2e/showroom/source-before.json'));
const changed=[];
for(const [file,hash] of Object.entries(baseline)) {
 const current=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
 if(current!==hash)changed.push(file);
}
const allowed=new Set(['src/components/chrome/Header.jsx','src/sections/home/Chapter.jsx','src/sections/home/Atelier.jsx','src/pages/auth/AuthShell.jsx']);
const outsideRedesign=changed.filter(f=>!f.endsWith('.css')&&!allowed.has(f));
assert.deepEqual(changed.filter(f=>f.startsWith('src/assets/')||f.startsWith('public/')||f.startsWith('supabase/')),[]);
await fs.writeFile('tests-e2e/showroom/changed-files.json',JSON.stringify(changed,null,2));
console.log('PASS asset/public/schema preservation. Concurrent changes outside the redesign:',JSON.stringify(outsideRedesign));
