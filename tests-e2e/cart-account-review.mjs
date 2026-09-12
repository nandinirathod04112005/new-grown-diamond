import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const sample = [{publicId:'demo-1',stockNumber:'NGD-2048',shape:'Round',carat:2.04,colour:'E',clarity:'VVS1',cut:'Excellent',lab:'IGI',price:null,currency:'USD',imageUrl:''}];
for (const width of [390,1440]) {
 const page = await browser.newPage({ viewport:{width,height:900}, reducedMotion:'no-preference' });
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.addInitScript(value=>localStorage.setItem('ngd-cart-v1',JSON.stringify(value)), sample);
 await page.goto('http://127.0.0.1:5173/cart',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:/Selected brilliance/}).waitFor();
 const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cart:document.querySelector('a[href="/cart"]')?.textContent,buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean)}));
 await page.screenshot({path:`tests-e2e/redesign/cart-${width}.png`,fullPage:true});
 console.log(width,result,errors);
 await page.close();
}
const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:5173/account',{waitUntil:'networkidle'});console.log('account',await page.locator('h1').first().textContent(),await page.getByRole('link',{name:'Sign in'}).count());await browser.close();
