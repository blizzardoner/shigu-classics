import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';

test('current text stays fixed until learner explicitly moves; boundaries do not wrap', () => {
  const books = [{id:'a'},{id:'b'}];
  assert.equal(d.moveLesson('a', 1, books), 'b');
  assert.equal(d.moveLesson('b', 1, books), 'b');
  assert.equal(d.moveLesson('a', -1, books), 'a');
});

test('wrong answers enter a persistent review queue; correct review clears them', () => {
  const lesson = {id:'a', questions:[{id:'q1', answer:1},{id:'q2',answer:0}]};
  let state = d.loadState(null, [lesson]);
  state = d.submitQuiz(state, lesson, {'q1':0,'q2':0}, '2026-11-16');
  assert.equal(state.results.a.score, 1);
  assert.deepEqual(Object.keys(state.wrong), ['a:q1']);
  const restored = d.loadState(JSON.stringify(state), [lesson]);
  assert.deepEqual(restored.results, state.results);
  state = d.answerReview(restored, 'a:q1', false, '2026-11-16');
  assert.equal(state.wrong['a:q1'].due, '2026-11-17');
  state = d.answerReview(state, 'a:q1', true, '2026-11-17');
  assert.equal(state.wrong['a:q1'], undefined);
});

test('incomplete quizzes cannot count as completed work', () => {
  const lesson = {id:'a',questions:[{id:'q',answer:0}]};
  assert.throws(() => d.submitQuiz(d.loadState(null,[lesson]),lesson,{},'2026-11-16'));
});

test('only learner-selected words are saved; difficult words return sooner', () => {
  let state = d.loadState(null,[{id:'a'}]);
  assert.deepEqual(state.words, {});
  state = d.saveWord(state, 'a', 0, '2026-11-16');
  const again = d.reviewWord(state,'a:0',false,'2026-11-16');
  const remembered = d.reviewWord(state,'a:0',true,'2026-11-16');
  assert.ok(again.words['a:0'].due < remembered.words['a:0'].due);
  assert.equal(d.loadState(JSON.stringify(remembered),[{id:'a'}]).words['a:0'].due, '2026-11-19');
});

test('writing check describes observables, not teacher grading; completion requires work', () => {
  const lesson = {id:'a', writing:{keywords:['忧','乐','天下']}};
  assert.equal(d.checkWriting('你好',lesson.writing).ready,false);
  assert.equal(d.checkWriting('春风明月'.repeat(20),lesson.writing).ready,false);
  const draft = '作者的忧与乐并非个人得失，而是关乎天下百姓的安危。文章以先忧后乐的次序，表达承担责任、以天下为己任的胸襟。';
  assert.equal(d.checkWriting(draft,lesson.writing).ready,true);
  let state = d.loadState(null,[lesson]);
  assert.equal(d.canComplete(state,lesson),false);
  state.drafts.a = draft;
  state.results.a = {score:3,total:5,answers:{}};
  assert.equal(d.canComplete(state,lesson),false);
  state.opened.push('a');
  assert.equal(d.canComplete(state,lesson),true);
});

test('malformed persistence never crashes or substitutes an unknown lesson', () => {
  for (const raw of ['{broken', 'null', '[]', '{"version":1,"current":"bad","drafts":{"a":3},"wrong":{"x":null},"words":[],"days":[null],"opened":["bad"]}']) {
    const state = d.loadState(raw,[{id:'a'}]);
    assert.equal(state.current,'a');
    assert.deepEqual(state.drafts,{});
    assert.deepEqual(state.words,{});
  }
});

test('memory comparison ignores punctuation, not missing words', () => {
  assert.equal(d.sameChinese('先天下之忧而忧，后天下之乐而乐。','先天下之忧而忧后天下之乐而乐'),true);
  assert.equal(d.sameChinese('先天下忧而忧','先天下之忧而忧'),false);
});
