import { lessons } from './lessons.js';
import { loadState, moveLesson, submitQuiz, saveWord, reviewWord, answerReview, checkWriting, canComplete, sameChinese, shiftDay } from './domain.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
let raw;
try { raw = localStorage.getItem('shigu-v1'); } catch { /* private browsing can restrict storage */ }
let state = loadState(raw, lessons);
let view = 'home';
let tab = 'read';
let filter = '全部';
let search = '';
let answers = {};
let graded = false;
let reviewFeedback = null;
let translations = new Set();
const current = () => lessons.find(l => l.id === state.current) || lessons[0];
const paths = {
 home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
 library:'<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16"/>',
 review:'<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7"/><path d="M12 7v5l3 2"/>',
 progress:'<path d="M4 20V10m8 10V4m8 16v-7"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 leaf:'<path d="M20 3C8 2 2 8 5 15s14 5 15-12ZM5 20 16 8"/>',
 check:'<path d="m4 12 5 5L20 6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
const btn = (label, attrs='', cls='') => `<button class="${cls}" ${attrs}>${label}</button>`;
const eyebrow = label => `<div class="eyebrow">${label}</div>`;
const empty = (title, text) => `<div class="empty">${icon('leaf')}<h3>${title}</h3><p>${text}</p></div>`;
function save() {
  try { localStorage.setItem('shigu-v1', JSON.stringify(state)); }
  catch { toast('无法写入本机存储，请导出学习记录，避免丢失。'); }
}
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(()=>$('#toast').classList.remove('show'),3000); }
function openLesson(id) {
  state.current = id;
  if (!state.opened.includes(id)) state.opened.push(id);
  tab='read'; view='reader'; translations=new Set();
  answers={...(state.results[id]?.answers || {})}; graded=Boolean(state.results[id]);
  save(); render(); window.scrollTo(0,0);
}
function nav() {
  return [['home','今日'],['library','篇目'],['review','复习'],['progress','足迹']].map(([id,label]) => btn(`${icon(id)}<span>${label}</span>`,`data-nav="${id}" ${view===id || (view==='reader'&&id==='home')?'aria-current="page"':''}`,`nav-item ${view===id || (view==='reader'&&id==='home')?'active':''}`)).join('');
}
function landscape() {
  return '<svg class="landscape" viewBox="0 0 500 260" aria-hidden="true"><defs><linearGradient id="mount" x2="0" y2="1"><stop stop-color="#a2cbb8"/><stop offset="1" stop-color="#e6f2e9"/></linearGradient></defs><circle cx="376" cy="66" r="29" fill="#edc8a9"/><path d="M0 220 65 139 116 171 209 46 297 148 350 112 500 220v40H0Z" fill="#e4eee5"/><path d="m110 260 155-148 45 45 71-80 119 173v10" fill="url(#mount)"/><path d="M0 247q127-55 244-14t256-7v34H0" fill="#b7d4be"/><path d="M0 257q160-35 295-8t205-9v20H0" fill="#87b59b"/><path d="m370 188 3-27m-3 15-12-9m14 4 14-13m-13 9-5-17" stroke="#587f67" stroke-width="3" fill="none"/><path d="m114 92 8-3 8 3m20-8 7-3 7 3" fill="none" stroke="#748879" stroke-width="2"/></svg>';
}
function home() {
  const l=current();
  const completed=Object.keys(state.completed).length;
  const due=Object.values(state.wrong).filter(x=>x.due<=today()).length+Object.values(state.words).filter(x=>x.due<=today()).length;
  return `<section class="welcome">${eyebrow('一日一篇 · 慢慢读懂')}<h2>把古人的话，<br class="mobile-break">读成自己的理解。</h2><p>不急着背答案。先读懂，再记牢。</p></section>
  <div class="home-grid"><section class="hero">${landscape()}<div class="hero-content"><span class="tag">继续学习 · ${esc(l.grade)}</span><h1>${esc(l.title)}</h1><p>${esc(l.era)} · ${esc(l.author)}</p><p class="hero-intro">${esc(l.intro)}</p>${btn(`开始今日学习 ${icon('arrow')}`,'id="start"','primary')}<small>建议 15–25 分钟 · 进度自动保存</small></div></section>
  <section class="rhythm card">${eyebrow('你的学习节奏')}<div class="stat-big">${completed}<span> / ${lessons.length} 篇</span></div><p>已完成精读与练习</p><div class="progress-track"><i style="width:${completed/lessons.length*100}%"></i></div><div class="mini-stats"><div><b>${state.days.length}</b><span>学习天数</span></div><div><b>${due}</b><span>待复习</span></div><div><b>${Object.keys(state.words).length}</b><span>收藏字词</span></div></div>${btn('去复习，巩固一下 →','data-nav="review"','text-button')}</section></div>
  <section class="section"><div class="section-heading"><h3>今天，走这四小步</h3><span>读 · 懂 · 练 · 记</span></div><div class="steps">${[['01','读原文','对照译文，理清文意','read'],['02','懂字词','抓实词、虚词与句式','words'],['03','练考点','做完小测，写出理解','practice'],['04','记名句','填空背诵，定期复习','memory']].map(([n,title,desc,t])=>`<button class="step" data-start-tab="${t}"><span class="step-no">${n}</span><b>${title}</b><span>${desc}</span></button>`).join('')}</div></section>
  <div class="scope-note"><b>篇目说明</b> 按八、九年级常见统编课文整理，另收录《陈涉世家》等拓展篇目；不是上海现行官方必考清单。年级分组仅供参考，以学校教材和教师要求为准。${btn('查看全部篇目 →','data-nav="library"','text-button')}</div>`;
}
function library() {
  const groups=['全部','八年级上','八年级下','九年级上','九年级下'];
  return `<section class="page-title">${eyebrow('书页之间，自有山河')}<h1>篇目书架<span>${lessons.length} 篇</span></h1><p>从一篇喜欢的文章开始，也可以按册学习。</p></section><label class="search-label" for="search">搜索篇名或作者</label><input id="search" type="search" placeholder="试试：岳阳楼记、苏轼…" value="${esc(search)}"><div class="filter-row">${groups.map(g=>btn(g,`data-filter="${g}" aria-pressed="${filter===g}"`,filter===g?'chip selected':'chip')).join('')}</div><div id="books" class="books">${bookCards()}</div>`;
}
function bookCards() {
  return lessons.filter(l=>(filter==='全部'||filter===l.grade)&&`${l.title}${l.author}`.includes(search)).map(l=>`<button class="book-card" data-open="${l.id}"><span class="book-spine">${esc(l.title.slice(0,1))}</span><span class="book-info"><small>${esc(l.grade)} · ${esc(l.era)}</small><b>${esc(l.title)}</b><span>${esc(l.author)} · ${l.questions.length} 道练习</span></span><span class="book-status">${state.completed[l.id]?'✓ 已完成':state.opened.includes(l.id)?'已读':'→'}</span></button>`).join('') || empty('还没有匹配的篇目','换一个关键词或年级试试。');
}
const tabs=[['read','原译对照'],['words','重点字词'],['points','主要考点'],['practice','考点练习'],['write','理解表达'],['memory','背诵填空']];
function reader() {
 const l=current(); const index=lessons.indexOf(l);
 return `<div class="reader-top">${btn('← 篇目书架','data-nav="library"','text-button')}<span>${index+1} / ${lessons.length}</span></div><header class="reader-heading">${eyebrow(esc(l.grade)+' · 参考分组')}<h1 class="reader-title">${esc(l.title)}</h1><p>${esc(l.era)} · ${esc(l.author)}</p></header><div class="tabbar" role="tablist" aria-label="学习步骤">${tabs.map(([id,label])=>btn(label,`data-tab="${id}" role="tab" aria-selected="${tab===id}"`,tab===id?'tab active':'tab')).join('')}</div><section id="lesson-panel" class="lesson-panel">${panel(l)}</section><footer class="reader-footer">${btn('← 上一篇',`data-move="-1" ${index===0?'disabled':''}`)}${btn('下一篇 →',`data-move="1" ${index===lessons.length-1?'disabled':''}`)}</footer>`;
}
function panel(l) {
 if(tab==='read') return `<div class="panel-intro"><div><h2>原文，逐句读懂</h2><p>${esc(l.intro)}</p></div>${btn(translations.size===l.paragraphs.length?'收起全部译文':'展开全部译文','id="toggle-all"','secondary')}</div><div class="reader-text">${l.paragraphs.map((p,i)=>`<article class="passage-block"><span class="line-number">${String(i+1).padStart(2,'0')}</span><div><p class="original">${esc(p.text)}</p>${btn(`${translations.has(i)?'− 收起':'＋ 查看'}译文`,`data-translation="${i}" aria-expanded="${translations.has(i)}"`,'translation-toggle')}${translations.has(i)?`<p class="translation">${esc(p.translation)}</p>`:''}</div></article>`).join('')}</div><div class="reading-note"><b>读懂再背，更容易记住。</b> 译文为辅助学习的自主释译，文字、断句及通假字可能因教材版本不同而有差异；作答时以学校课本为准。</div>${btn('读完了，看看重点字词 →','data-tab="words"','primary')}`;
 if(tab==='words') return `<div class="panel-intro"><h2>在句子里，记住字词</h2><p>只收藏自己不熟的词，不把整本书塞进复习队列。</p></div><div class="word-grid">${l.words.map((w,i)=>`<article class="word-card"><div><h3>${esc(w.term)} <small>${esc(w.pinyin)}</small></h3>${btn(state.words[`${l.id}:${i}`]?'✓ 已收藏':'＋ 收藏',`data-save-word="${i}"`,'save-word')}</div><p>${esc(w.meaning)}</p><blockquote>${esc(w.example)}</blockquote></article>`).join('')}</div>`;
 if(tab==='points') return `<div class="panel-intro"><h2>抓住这篇的得分点</h2><p>理解用法与文本依据，比死记一段“标准答案”更重要。</p></div><div class="point-grid">${l.points.map((p,i)=>`<article class="point-card"><span class="point-number">${String(i+1).padStart(2,'0')}</span><h3>${esc(p.label)}</h3><p>${esc(p.detail)}</p></article>`).join('')}</div>${btn('学完了，做一组练习 →','data-tab="practice"','primary')}`;
 if(tab==='practice') return quiz(l);
 if(tab==='write') return `<div class="panel-intro"><h2>用自己的话，说清楚</h2><p>建议写 50–120 字，引用文本中的细节或关键词。</p></div><div class="prompt-card">${esc(l.writing.prompt)}</div><label for="draft" class="search-label">我的理解（自动保存在本机）</label><textarea id="draft" rows="7" placeholder="先写出观点，再用原文中的细节解释…">${esc(state.drafts[l.id]||'')}</textarea><div class="draft-meta"><span id="draft-count">${checkWriting(state.drafts[l.id]||'',l.writing).length} 字</span><span>不上传 · 每篇独立保存</span></div>${btn('检查表达准备情况','id="check-writing"','primary')}<div id="writing-feedback" aria-live="polite"></div><details><summary>写完再看：参考思路</summary><p>${esc(l.writing.reference)}</p><p class="muted">这是参考思路，不是唯一答案。</p></details><div class="finish-card"><h3>给今天画一个小句号</h3><p>打开精读、完成全部选择题，并写满 30 字且命中至少两个提示关键词，即可记录完成。这只是学习步骤记录，不代表已掌握或获得教师评分。</p><p class="muted">提示词：${l.writing.keywords.map(esc).join('、')}</p>${btn(state.completed[l.id]?'✓ 本篇已完成':'完成本篇学习',`id="finish" ${canComplete(state,l)?'':'disabled'}`,'primary')}</div>`;
 if(tab==='memory') return `<div class="panel-intro"><h2>合上译文，试着记住</h2><p>先填空再核对；只忽略标点和空格，不忽略错别字。</p></div>${l.memory.map((m,i)=>`<article class="memory-card"><p class="original">${esc(m.before)} <label class="sr-only" for="memory-${i}">第${i+1}处填空</label><input id="memory-${i}" data-memory="${i}" placeholder="补出原句" autocomplete="off"> ${esc(m.after)}</p>${btn('核对原句',`data-check-memory="${i}"`,'secondary')}<p id="memory-result-${i}" aria-live="polite"></p></article>`).join('')}`;
 return '';
}
function quiz(l) {
 const result=graded?state.results[l.id]:null;
 return `<div class="panel-intro"><h2>理解了，就试一试</h2><p>${l.questions.length} 道自主编写练习 · 提交后显示解析 · 错题进入复习本</p></div>${result?`<div class="quiz-result" role="status">答对 <b>${result.score} / ${result.total}</b> 题。${btn('重新练习','id="retry"','secondary')}</div>`:''}<div class="question-list">${l.questions.map((q,i)=>`<article class="question-card"><span class="tag">${i+1} · ${esc(q.kind)}</span><h3>${esc(q.stem)}</h3><div class="options">${q.options.map((o,n)=>btn(`<span class="option-letter">${'ABCD'[n]}</span><span>${esc(o)}</span>${result&&q.answer===n?'<strong>✓ 正确</strong>':''}`,`data-q="${q.id}" data-choice="${n}" aria-pressed="${answers[q.id]===n}" ${graded?'disabled':''}`,`option ${answers[q.id]===n?'chosen':''} ${result&&q.answer===n?'correct':''} ${result&&answers[q.id]===n&&q.answer!==n?'incorrect':''}`)).join('')}</div>${result?`<p class="explanation"><b>${result.answers[q.id]===q.answer?'✓ 回答正确':'✕ 再看一眼原文'}</b><br>${esc(q.explanation)}</p>`:''}</article>`).join('')}</div>${!graded?btn('提交并查看解析',`id="submit-quiz" ${l.questions.every(q=>Number.isInteger(answers[q.id]))?'':'disabled'}`,'primary'):btn('下一步：写下你的理解 →','data-tab="write"','primary')}`;
}
function review() {
 const dueWrong=Object.entries(state.wrong).filter(([,w])=>w.due<=today());
 const dueWords=Object.entries(state.words).filter(([,w])=>w.due<=today());
 const first=dueWrong.map(([key,w])=>({key,lesson:lessons.find(l=>l.id===w.lessonId),q:lessons.find(l=>l.id===w.lessonId)?.questions.find(q=>q.id===w.questionId)})).find(x=>x.q);
 return `<section class="page-title">${eyebrow('温故，才能知新')}<h1>复习小院</h1><p>答对一题，清掉一个盲点。忘记了也没关系。</p></section><div class="review-stats"><span>${Object.keys(state.wrong).length} 道错题</span><span>${dueWords.length} 个今日字词</span><span>字词间隔 1 / 3 / 6 / 12 / 24 / 30 天</span></div><h2>错题再挑战</h2>${first?`<article class="question-card"><span class="tag">${esc(first.lesson.title)} · ${dueWrong.length} 题待练</span><h3>${esc(first.q.stem)}</h3><div class="options">${first.q.options.map((o,i)=>btn(`${'ABCD'[i]} · ${esc(o)}`,`data-review-option="${i}" data-review-key="${first.key}" ${reviewFeedback?'disabled':''}`,'option')).join('')}</div>${reviewFeedback?`<div id="review-feedback" class="explanation"><b>${reviewFeedback.correct?'✓ 正确，这道题已移出错题本':'✕ 还需巩固，明天再练'}</b><p>${esc(first.q.explanation)}</p>${btn('继续复习 →','id="review-next"','primary')}</div>`:''}</article>`:empty('今天的错题已复习完','做题答错后会自动收集到这里；未到期错题会在明天出现。')}<h2 class="section">我的字词卡</h2>${dueWords.length?dueWords.map(([key,w])=>{
 const l=lessons.find(l=>l.id===w.lessonId); const word=l?.words[w.index];
 if(!word) return '';
 return `<article class="review-word word-card"><span class="tag">${esc(l.title)}</span><h3>${esc(word.term)} <small>${esc(word.pinyin)}</small></h3><p>先想一想：它在原句里是什么意思？</p>${btn('翻开释义',`data-show-word="${key}"`,'secondary')}<div id="word-${key.replace(':','-')}" hidden><p><b>${esc(word.meaning)}</b></p><blockquote>${esc(word.example)}</blockquote><div class="button-row">${btn('没记住 · 明天再来',`data-word-forget="${key}"`)}${btn('记住了',`data-word-remember="${key}"`,'primary')}</div></div></article>`;
 }).join(''):empty('今天的字词也复习好了','在“重点字词”中收藏不熟悉的词，它们才会出现在这里。')}`;
}
function progress() {
 const completed=Object.keys(state.completed).length;
 const results=Object.values(state.results); const total=results.reduce((n,r)=>n+r.total,0); const score=results.reduce((n,r)=>n+r.score,0);
 return `<section class="page-title">${eyebrow('每一小步，都算数')}<h1>学习足迹</h1><p>记录认真读过的文字，而不只追逐一个分数。</p></section><div class="progress-grid">${[[completed,'完成篇目'],[state.days.length,'累计学习天数'],[total?`${Math.round(score/total*100)}%`:'—','最近一轮小测正确率'],[Object.keys(state.words).length,'收藏字词']].map(([n,label])=>`<div class="card stat-tile"><b>${n}</b><span>${label}</span></div>`).join('')}</div><h2 class="section">最近七天</h2><div class="week">${Array.from({length:7},(_,i)=>shiftDay(today(),i-6)).map(day=>`<div class="day ${state.days.includes(day)?'done':''}"><span>${day.slice(5)}</span><b>${state.days.includes(day)?'✓':'·'}</b></div>`).join('')}</div><h2 class="section">读过的篇目</h2><div class="history-list">${state.opened.length?[...state.opened].reverse().map(id=>{const l=lessons.find(l=>l.id===id); return `<button class="history-item" data-open="${id}"><span><b>${esc(l.title)}</b><small>${esc(l.grade)}</small></span><span>${state.completed[id]?'✓ 已完成':state.results[id]?`${state.results[id].score}/${state.results[id].total} 题`:'继续学习 →'}</span></button>`;}).join(''):empty('第一篇，就从今天开始','打开一篇课文，书页会留在这里。')}</div><section class="privacy card"><h3>学习记录，只留在你的设备</h3><p>原文阅读、练习、草稿与字词本均不上传。不含广告、追踪器或 AI 服务密钥。清除浏览器数据会删除进度，建议定期导出。</p>${btn('导出学习记录','id="export"','secondary')}<h3>在 iPhone 上安装</h3><p>需要用 Safari 打开正式 HTTPS 地址 → 分享 → 添加到主屏幕。首次联网加载成功后可离线学习；当前是否离线可看右上角状态。</p><h3>内容与版本说明</h3><p>26 篇参考库以常见统编八、九年级分组，不是上海官方教学或考试范围。现代译文、讲解、练习为自主整理，不能替代学校教师批改。《陈涉世家》按常见课文节选收录。</p><details><summary>逐篇原典参考链接</summary>${lessons.map(l=>`<p><b>${esc(l.title)}</b><br>${l.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join(' · ')}</p>`).join('')}</details></section>`;
}
function render() {
 $('#app').innerHTML=`<header class="site-header"><a class="brand" href="#" aria-label="拾古首页"><span class="brand-seal">拾</span><span>拾古<small>每日文言</small></span></a><div class="top-nav">${nav()}</div><span class="connection"><i></i>${navigator.onLine?'本机学习':'离线可读'}</span></header><main>${({home,library,reader,review,progress})[view]()}</main><nav class="bottom-nav" aria-label="主要导航">${nav()}</nav><footer class="site-footer">拾古 SHIGU <span>一字一句，皆有所获。</span></footer>`;
 bind();
}
function bind() {
 document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>{view=el.dataset.nav;reviewFeedback=null;render();window.scrollTo(0,0);});
 $('.brand').onclick=e=>{e.preventDefault();view='home';render();window.scrollTo(0,0);};
 $('#start')?.addEventListener('click',()=>openLesson(state.current));
 document.querySelectorAll('[data-start-tab]').forEach(el=>el.onclick=()=>{openLesson(state.current);tab=el.dataset.startTab;render();});
 document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>openLesson(el.dataset.open));
 document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{tab=el.dataset.tab;render();});
 document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>openLesson(moveLesson(state.current,Number(el.dataset.move),lessons)));
 document.querySelectorAll('[data-filter]').forEach(el=>el.onclick=()=>{filter=el.dataset.filter;render();});
 $('#search')?.addEventListener('input',e=>{search=e.target.value;$('#books').innerHTML=bookCards();document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>openLesson(el.dataset.open));});
 document.querySelectorAll('[data-translation]').forEach(el=>el.onclick=()=>{const y=scrollY;const i=Number(el.dataset.translation);translations.has(i)?translations.delete(i):translations.add(i);render();window.scrollTo(0,y);});
 $('#toggle-all')?.addEventListener('click',()=>{translations=translations.size===current().paragraphs.length?new Set():new Set(current().paragraphs.map((_,i)=>i));render();});
 document.querySelectorAll('[data-save-word]').forEach(el=>el.onclick=()=>{state=saveWord(state,state.current,Number(el.dataset.saveWord),today());save();el.innerHTML='✓ 已收藏';toast('已加入字词复习本');});
 document.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>{const y=scrollY;answers[el.dataset.q]=Number(el.dataset.choice);render();window.scrollTo(0,y);});
 $('#submit-quiz')?.addEventListener('click',()=>{state=submitQuiz(state,current(),answers,today());save();graded=true;render();$('.quiz-result').scrollIntoView({block:'center',behavior:'smooth'});});
 $('#retry')?.addEventListener('click',()=>{graded=false;answers={};render();});
 $('#draft')?.addEventListener('input',e=>{state.drafts[state.current]=e.target.value;save();$('#draft-count').textContent=`${checkWriting(e.target.value,current().writing).length} 字`;$('#writing-feedback').innerHTML='';$('#finish').disabled=!canComplete(state,current());});
 $('#check-writing')?.addEventListener('click',()=>{const r=checkWriting(state.drafts[state.current]||'',current().writing);$('#writing-feedback').innerHTML=`<div class="feedback"><h3>本机表达准备检查</h3><p>${r.ready?'✓ 字数与主题词条件已达到，可以对照参考思路继续修改。':'还可以再补充：'+(r.length<30?'至少写满 30 字。':'')+(r.hits.length<2?'请围绕问题，加入至少两个提示关键词。':'')}</p><p>${r.length} 字 · 命中主题词：${r.hits.map(esc).join('、')||'暂无'}</p><small>仅检查字数和词语出现情况，不判断论证、翻译准确性或语言质量，不是 AI 或教师评分。</small></div>`;});
 $('#finish')?.addEventListener('click',()=>{if(!canComplete(state,current())) return;state.completed[state.current]=today();if(!state.days.includes(today()))state.days.push(today());save();render();toast('今日又读懂了一篇，真好。');});
 document.querySelectorAll('[data-check-memory]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.checkMemory),m=current().memory[i];$(`#memory-result-${i}`).textContent=sameChinese($(`[data-memory="${i}"]`).value,m.answer)?'✓ 正确，记得很扎实！':`✕ 再记一次，原句是：${m.answer}`;});
 document.querySelectorAll('[data-review-option]').forEach(el=>el.onclick=()=>{const key=el.dataset.reviewKey,w=state.wrong[key],q=lessons.find(l=>l.id===w.lessonId).questions.find(q=>q.id===w.questionId);reviewFeedback={key,correct:Number(el.dataset.reviewOption)===q.answer};render();});
 $('#review-next')?.addEventListener('click',()=>{state=answerReview(state,reviewFeedback.key,reviewFeedback.correct,today());save();reviewFeedback=null;render();});
 document.querySelectorAll('[data-show-word]').forEach(el=>el.onclick=()=>{const target=$(`#word-${el.dataset.showWord.replace(':','-')}`);target.hidden=false;el.hidden=true;});
 for (const [attribute,remember] of [['data-word-remember',true],['data-word-forget',false]]) document.querySelectorAll(`[${attribute}]`).forEach(el=>el.onclick=()=>{state=reviewWord(state,el.getAttribute(attribute),remember,today());save();render();toast(remember?'记住了！下一次稍后再见。':'没关系，明天再见一次。');});
 $('#export')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`拾古学习记录-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
window.addEventListener('online',render);window.addEventListener('offline',render);
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(()=>toast('离线缓存未就绪，请保持联网重开一次。'));
