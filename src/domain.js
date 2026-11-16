export function moveLesson(id, delta, lessons) {
  const index = Math.max(0, lessons.findIndex(lesson => lesson.id === id));
  return lessons[Math.max(0, Math.min(lessons.length - 1, index + delta))].id;
}

const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function loadState(raw, lessons) {
  const empty = {version:1, current:lessons[0].id, drafts:{}, results:{}, wrong:{}, words:{}, opened:[], completed:{}, days:[]};
  try {
    const saved = JSON.parse(raw);
    if (!record(saved) || saved.version !== 1) return empty;
    const state = {...empty};
    const ids = new Set(lessons.map(l => l.id));
    if (ids.has(saved.current)) state.current = saved.current;
    for (const key of ['drafts','results','wrong','words','completed']) {
      if (record(saved[key])) state[key] = {...saved[key]};
    }
    state.drafts = Object.fromEntries(Object.entries(state.drafts).filter(([id,v]) => ids.has(id) && typeof v === 'string'));
    state.results = Object.fromEntries(Object.entries(state.results).filter(([id,v]) => ids.has(id) && record(v) && record(v.answers) && Number.isInteger(v.score) && Number.isInteger(v.total) && v.score >= 0 && v.score <= v.total));
    for (const key of ['wrong','words']) state[key] = Object.fromEntries(Object.entries(state[key]).filter(([,v]) => record(v) && ids.has(v.lessonId) && datePattern.test(v.due)));
    state.opened = Array.isArray(saved.opened) ? [...new Set(saved.opened.filter(id => ids.has(id)))] : [];
    state.completed = Object.fromEntries(Object.entries(state.completed).filter(([id,v]) => ids.has(id) && datePattern.test(v)));
    state.days = Array.isArray(saved.days) ? [...new Set(saved.days.filter(v => typeof v === 'string' && datePattern.test(v)))] : [];
    return state;
  } catch { return empty; }
}

export function shiftDay(day, amount) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0,10);
}

export function submitQuiz(state, lesson, answers, day) {
  if (!lesson.questions.every(q => Number.isInteger(answers[q.id]) && answers[q.id] >= 0 && answers[q.id] < 4)) throw new Error('请完成全部题目');
  const next = structuredClone(state);
  let score = 0;
  for (const q of lesson.questions) {
    const key = `${lesson.id}:${q.id}`;
    if (answers[q.id] === q.answer) { score++; }
    else next.wrong[key] = {lessonId:lesson.id, questionId:q.id, due:day};
  }
  next.results[lesson.id] = {score, total:lesson.questions.length, answers:{...answers}, day};
  return next;
}

export function answerReview(state, key, correct, day) {
  const next = structuredClone(state);
  if (!next.wrong[key]) return next;
  if (correct) delete next.wrong[key];
  else next.wrong[key].due = shiftDay(day, 1);
  return next;
}

export function saveWord(state, lessonId, index, day) {
  const next = structuredClone(state);
  const key = `${lessonId}:${index}`;
  if (!next.words[key]) next.words[key] = {lessonId, index, due:day, successes:0};
  return next;
}

export function reviewWord(state, key, remembered, day) {
  const next = structuredClone(state);
  const word = next.words[key];
  if (!word) return next;
  word.successes = remembered ? (Number(word.successes) || 0) + 1 : 0;
  word.due = shiftDay(day, remembered ? Math.min(30, 3 * 2 ** (word.successes - 1)) : 1);
  return next;
}

export function checkWriting(text, writing) {
  const length = (text.match(/[\p{Script=Han}\p{L}\p{N}]/gu) || []).length;
  const hits = writing.keywords.filter(word => text.includes(word));
  return {length, hits, ready:length >= 30 && hits.length >= Math.min(2, writing.keywords.length)};
}

export function canComplete(state, lesson) {
  return state.opened.includes(lesson.id) && Boolean(state.results[lesson.id]) && checkWriting(state.drafts[lesson.id] || '', lesson.writing).ready;
}

export function sameChinese(actual, expected) {
  const normalize = value => value.replace(/[\p{P}\p{Z}\s]/gu, '');
  return normalize(actual) === normalize(expected);
}
