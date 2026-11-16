import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { lessons } from '../src/lessons.js';
const base=process.env.BASE_URL||'http://127.0.0.1:4186/';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let panels=0;
try {
 await page.goto(base,{waitUntil:'networkidle'});
 for(const lesson of lessons){
  await page.locator('.bottom-nav [data-nav="library"]').click();
  await page.locator(`[data-open="${lesson.id}"]`).click();
  assert.equal(await page.locator('.reader-title').textContent(),lesson.title);
  for(const [name,selector,min] of [['原译对照','.passage-block',lesson.paragraphs.length],['重点字词','.word-card',lesson.words.length],['主要考点','.point-card',lesson.points.length],['考点练习','.question-card',lesson.questions.length],['理解表达','#draft',1],['背诵填空','.memory-card',lesson.memory.length]]) {
   await page.getByRole('tab',{name}).click();
   assert.equal(await page.locator(selector).count(),min,`${lesson.title}: ${name}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${lesson.title}: overflow ${name}`);
   const small=await page.locator('button:visible').evaluateAll(elements=>elements.filter(e=>!e.disabled&&(e.getBoundingClientRect().width<44||e.getBoundingClientRect().height<44)).map(e=>e.textContent));
   assert.deepEqual(small,[],`${lesson.title}: small touch target ${name}`);
   panels++;
  }
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'EDGE_FULL_LIBRARY_PASS',lessons:lessons.length,panels,consoleErrors:errors.length}));
} finally {await browser.close();}
