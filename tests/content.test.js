import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/lessons.js';
import { checkWriting } from '../src/domain.js';

const inventory=['三峡','答谢中书书','记承天寺夜游','与朱元思书','富贵不能淫','生于忧患死于安乐','愚公移山','周亚夫军细柳','桃花源记','小石潭记','核舟记','北冥有鱼','庄子与惠子游于濠梁之上','虽有嘉肴','大道之行也','马说','岳阳楼记','醉翁亭记','湖心亭看雪','鱼我所欲也','唐雎不辱使命','送东阳马生序','曹刿论战','邹忌讽齐王纳谏','陈涉世家','出师表'];
const normalize = text => text.replace(/[\p{P}\p{Z}\s]/gu,'');
test('the declared reference inventory is complete without duplicated texts',()=>{
 assert.deepEqual(lessons.map(l=>l.title),inventory);
 assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length);
});
for(const lesson of lessons) test(`${lesson.title}: usable original, translation, vocabulary, exam practice and memorization`,()=>{
 for(const field of ['id','grade','title','author','era','intro']) assert.ok(typeof lesson[field]==='string'&&lesson[field].length,`${field} missing`);
 assert.ok(lesson.paragraphs.length>=1);
 for(const p of lesson.paragraphs){assert.ok(p.text.length>5);assert.ok(p.translation.length>5);}
 const original=normalize(lesson.paragraphs.map(p=>p.text).join(''));
 assert.ok(original.length>=60,'original too short even for a short reference text');
 assert.ok(lesson.words.length>=5);
 for(const w of lesson.words)for(const field of ['term','pinyin','meaning','example'])assert.ok(w[field]?.length,`word ${field}`);
 assert.ok(lesson.points.length>=4);
 for(const p of lesson.points){assert.ok(p.label?.length);assert.ok(p.detail?.length>12);}
 assert.ok(lesson.questions.length>=5);
 assert.equal(new Set(lesson.questions.map(q=>q.id)).size,lesson.questions.length);
 assert.ok(new Set(lesson.questions.map(q=>q.answer)).size>=2,'answer positions must vary');
 for(const q of lesson.questions){assert.equal(q.options.length,4);assert.ok(q.options.every(o=>typeof o==='string'&&o.length));assert.equal(new Set(q.options).size,4);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.ok(q.explanation?.length>8);}
 assert.ok(lesson.writing.prompt?.length>10);assert.ok(lesson.writing.reference?.length>=35);assert.ok(lesson.writing.keywords.length>=2);
 assert.ok(checkWriting(lesson.writing.reference,lesson.writing).ready,'reference response must satisfy its own transparent readiness conditions');
 assert.ok(lesson.memory.length>=2);
 for(const m of lesson.memory){assert.ok(m.answer.length);assert.ok(original.includes(normalize(m.before+m.answer+m.after)),`memory gap not found in original: ${m.before}${m.answer}${m.after}`);}
 assert.ok(lesson.sources.length);
 for(const s of lesson.sources)assert.ok(new URL(s.url).protocol==='https:');
});
