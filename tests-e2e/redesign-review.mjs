import {chromium} from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('tests-e2e/redesign',{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
const results=[];
for(const width of [390,1440]) {
 const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/','/about','/diamonds','/jewellery','/education','/shapes','/why-lab-grown','/cvd-vs-natural','/price-and-size','/contact','/faq','/blogs','/login']){
  await page.goto('http://127.0.0.1:5173'+route,{waitUntil:'domcontentloaded'});
  await page.locator('h1').first().waitFor();await page.waitForTimeout(500);
  results.push({width,route,...await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length})),errors:[...errors]});
  if(['/','/contact','/diamonds','/education'].includes(route))await page.screenshot({path:`tests-e2e/redesign/${route.slice(1)||'home'}-${width}.png`,fullPage:route==='/'});
  if(route==='/'){
   const faq=page.getByRole('button',{name:'Do you offer custom jewellery?'});await faq.click();if(await faq.getAttribute('aria-expanded')!=='true')throw Error('FAQ failed');
  }
 }
 await page.close();
}
await browser.close();await fs.writeFile('tests-e2e/redesign/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
