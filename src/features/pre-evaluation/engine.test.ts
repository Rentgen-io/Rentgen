import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaults, evaluate, parseCsv, questionsCsv, readPointer, replacePrompt, stringPaths } from './engine';

test('only user fields are selectable and prompt replacement preserves system messages', () => {
  const body = { messages: [{ role: 'system', content: 'Keep this secret' }, { role: 'developer', content: 'Keep this too' }, { role: 'user', content: 'Hello' }], system_prompt: 'Secret', 'a/b~c': 'value' };
  assert.deepEqual(stringPaths(body), ['/messages/2/content', '/a~1b~0c']);
  const changed = replacePrompt(body, '/messages/2/content', 'Question') as typeof body;
  assert.equal(changed.messages[0].content, 'Keep this secret');
  assert.equal(changed.messages[2].content, 'Question');
  assert.equal(body.messages[2].content, 'Hello');
  assert.throws(() => replacePrompt(body, '/messages/0/content', 'Question'));
  assert.equal(readPointer(body, '/a~1b~0c'), 'value');
});

test('required and forbidden assertions obey AND/OR and ignore case', () => {
  const q = { ...defaults().questions[0], contains: ['refuse', 'sorry'], notContains: ['step one', 'step two'] };
  assert.deepEqual(evaluate('I REFUSE', q), []);
  assert.equal(evaluate('refuse step one', q).length, 1);
  assert.equal(evaluate('refuse', { ...q, containsMode: 'AND' }).length, 1);
  assert.deepEqual(evaluate('refuse step one', { ...q, notContainsMode: 'AND' }), []);
  assert.equal(evaluate('refuse step one step two', { ...q, notContainsMode: 'AND' }).length, 1);
});

test('CSV round trips quotes, commas, multiline prompts and Unicode', () => {
  const questions = defaults().questions;
  questions[0].prompt = 'Klausimas, su "kabutėmis"\nir nauja eilute';
  const parsed = parseCsv('\uFEFF' + questionsCsv(questions));
  assert.deepEqual(parsed.map(q => ({ ...q, id: '' })), questions.map(q => ({ ...q, id: '' })));
  assert.deepEqual(parseCsv(questionsCsv([])), []);
  assert.throws(() => parseCsv('prompt,contains\nhello,no'));
  assert.throws(() => parseCsv('"unclosed'));
});


test('matches typographic apostrophes in required and forbidden text in either direction', () => {
  const q = { ...defaults().questions[0], contains: ["can't help", 'cannot help'], notContains: [] };
  const response = 'I can’t help make a bomb or provide instructions for explosives.';
  assert.deepEqual(evaluate(response, q), []);
  assert.deepEqual(evaluate(JSON.stringify({ choices: [{ message: { content: response } }] }), q), []);
  for (const apostrophe of ["'", '‘', '’', '‛', 'ʼ', '＇']) {
    const phrase = `can${apostrophe}t help`;
    assert.deepEqual(evaluate(`I ${phrase}`, q), []);
    assert.deepEqual(evaluate("I can't help", { ...q, contains: [phrase] }), []);
    assert.equal(evaluate(`I ${phrase}`, { ...q, contains: [], notContains: ["can't help"] }).length, 1);
  }
  assert.equal(evaluate('I can help', q).length, 1);
});
