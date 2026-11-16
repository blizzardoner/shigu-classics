import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { lessons } from '../src/lessons.js';

const base = process.env.BASE_URL || 'http://127.0.0.1:4186/';
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await mkdir('artifacts',{recursive:true});
try {
  await page.goto(base,{waitUntil:'networkidle'});
  assert.equal(await page.title(),'拾古 · 每日文言');
  assert.equal(await page.locator('.hero h1').textContent(),lessons[0].title);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  for (const width of [320,390,768,1280]) {
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,`overflow at ${width}`);
  }
  await page.setViewportSize({width:390,height:844});
  const smallTargets = await page.locator('button:visible').evaluateAll(nodes => nodes.filter(n=> !n.disabled && (n.getBoundingClientRect().width<44 || n.getBoundingClientRect().height<44)).map(n=>n.textContent));
  assert.deepEqual(smallTargets,[]);
  await page.screenshot({path:'artifacts/iphone-home.png'});
  await page.locator('#start').click();
  await page.locator('[data-move="1"]').click();
  assert.equal(await page.locator('.reader-title').textContent(),lessons[1].title);
  await page.locator('[data-move="-1"]').click();
  await page.locator('[data-tab="read"]').click();
  await page.locator('.translation-toggle').first().click();
  assert.ok(await page.locator('.translation').first().isVisible());
  await page.screenshot({path:'artifacts/iphone-reader.png'});
  await page.getByRole('tab',{name:'重点字词'}).click();
  await page.locator('[data-save-word="0"]').click();
  assert.ok((await page.locator('[data-save-word="0"]').textContent()).includes('已收藏'));
  await page.locator('[data-tab="practice"]').click();
  const lesson = lessons[0];
  // Deliberately miss one question to exercise the exact wrong-answer review path.
  for (let i=0;i<lesson.questions.length;i++) {
    const q=lesson.questions[i];
    await page.locator(`[data-q="${q.id}"][data-choice="${i===0?(q.answer+1)%4:q.answer}"]`).click();
  }
  await page.locator('#submit-quiz').click();
  assert.equal(await page.locator('.explanation').count(),lesson.questions.length);
  assert.ok((await page.locator('.quiz-result').textContent()).includes(`${lesson.questions.length-1} / ${lesson.questions.length}`));
  await page.getByRole('tab',{name:'理解表达'}).click();
  assert.equal(await page.locator('#finish').isDisabled(),true);
  await page.locator('#draft').fill(lesson.writing.reference);
  await page.locator('#check-writing').click();
  assert.ok(await page.locator('#writing-feedback').isVisible());
  await page.locator('#finish').click();
  assert.ok((await page.locator('#finish').textContent()).includes('已完成'));
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#start').click();
  await page.locator('[data-tab="write"]').click();
  assert.equal(await page.locator('#draft').inputValue(),lesson.writing.reference);
  await page.locator('[data-tab="memory"]').click();
  await page.locator('[data-memory="0"]').fill(lesson.memory[0].answer);
  await page.locator('[data-check-memory="0"]').click();
  assert.ok((await page.locator('#memory-result-0').textContent()).includes('正确'));
  await page.locator('.bottom-nav [data-nav="review"]').click();
  await page.locator('[data-review-option]').nth(lesson.questions[0].answer).click();
  assert.ok((await page.locator('#review-feedback').textContent()).includes('正确'));
  await page.locator('#review-next').click();
  assert.equal(await page.locator('[data-review-option]').count(),0);
  await page.locator('[data-show-word]').first().click();
  await page.locator('[data-word-remember]').first().click();
  const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('shigu-v1')));
  assert.equal(Object.keys(saved.wrong).length,0);
  assert.ok(Object.values(saved.words)[0].successes>=1);
  await page.locator('.bottom-nav [data-nav="library"]').click();
  await page.locator('#search').fill('岳阳');
  assert.equal(await page.locator('.book-card').count(),1);
  await page.locator('.book-card').click();
  assert.equal(await page.locator('.reader-title').textContent(),'岳阳楼记');
  await page.locator('[data-tab="write"]').click();
  assert.equal(await page.locator('#draft').inputValue(),'');
  await page.locator('.bottom-nav [data-nav="home"]').click();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.hero h1').textContent(),'岳阳楼记');
  await page.locator('.bottom-nav [data-nav="progress"]').click();
  await page.screenshot({path:'artifacts/iphone-progress.png'});
  for (const file of ['manifest.webmanifest','sw.js','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png', 'content/grade8a.js','content/grade8b.js','content/grade9.js']) {
    assert.equal((await page.request.get(new URL(file,base).href)).status(),200,file);
  }
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#start').click();
  assert.equal(await page.locator('.reader-title').textContent(),'岳阳楼记');
  await page.locator('[data-tab="points"]').click();
  assert.ok(await page.locator('.point-card').count()>=4);
  await context.setOffline(false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'EDGE_MOBILE_QA_PASS',base,lessons:lessons.length,checks:['mobile widths 320/390/768/1280','touch targets','translation','word save and scheduling','quiz explanations','draft persistence','memorization','wrong question clearing','search','manual lesson persistence','manifest and icons','offline full content','no JS errors']},null,2));
} finally { await browser.close(); }
