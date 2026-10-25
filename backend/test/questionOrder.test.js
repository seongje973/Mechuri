const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pickQuestionOrder, ALL_QUESTION_IDS, MAX_QUESTIONS } = require('../src/realtime/questionOrder');

test('every server question id exists in the app question list', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/constants/akinatorQuestions.ts'), 'utf8');
  const appIds = [...source.matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]);
  for (const id of ALL_QUESTION_IDS) assert.ok(appIds.includes(id), `${id} is missing from akinatorQuestions.ts`);
});

test('question order starts with situation questions and has no duplicates', () => {
  for (let seed = 0; seed < 50; seed++) {
    let x = seed + 1;
    const random = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const order = pickQuestionOrder(random);
    assert.strictEqual(order.length, MAX_QUESTIONS);
    assert.deepStrictEqual(order.slice(0, 2), ['serving-delivery', 'price-low']);
    assert.strictEqual(new Set(order).size, order.length);
    assert.ok(!order.includes('party-solo'));
    assert.ok(order.filter((id) => id.startsWith('cuisine-')).length <= 2);
  }
});
