import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const phase = process.argv[2] || 'after';
const dir = `tests-e2e/showroom/${phase}`;
await fs.mkdir(dir, {recursive:true});
const browser = await chromium.launch();
const results=[];
try {
 for (const width of [390,1440]) for (const theme of ['dark','light']) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.addInitScript(t=>localStorage.setItem('ngd-theme',t),theme);
  await page.route('**/*',r=>r.request().url().startsWith('http://localhost:5173')?r.continue():r.abort());
  for(const route of ['/','/education','/diamonds','/jewellery','/contact','/blogs','/login']) {
   await page.goto(`http://localhost:5173${route}`,{waitUntil:'domcontentloaded'});
   await page.locator('h1').first().waitFor();
   await page.waitForTimeout(200);
   await page.screenshot({path:`${dir}/${route.slice(1)||'home'}-${width}-${theme}.png`});
   results.push({route,width,theme,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length}))});
   if(route==='/') for(const id of ['diamonds','precision','jewellery']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(650);
    await page.screenshot({path:`${dir}/chapter-${id}-${width}-${theme}.png`});
   }
  }
  await page.close();console.log(`Reviewed ${width} ${theme}`);
 }
} finally {await browser.close();await fs.writeFile(`${dir}/report.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results.filter(r=>r.overflow||r.h1!==1)));
