import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_JSON_HIGHLIGHT_LENGTH, shouldHighlightJson, tokenizeJson } from './jsonSyntax';

test('respects explicit media types and detects JSON while typing', () => {
  assert.equal(shouldHighlightJson('{"name":', ''), true);
  assert.equal(shouldHighlightJson('[1,', ''), true);
  assert.equal(shouldHighlightJson('true', ''), true);
  assert.equal(shouldHighlightJson('42', ''), true);
  assert.equal(shouldHighlightJson('name=value&other=true', ''), false);
  assert.equal(shouldHighlightJson('{"a":1}', 'application/x-www-form-urlencoded'), false);
  assert.equal(shouldHighlightJson('{"a":1}', 'text/plain'), false);
  assert.equal(shouldHighlightJson('invalid JSON being edited', 'Application/JSON; charset=utf-8'), true);
  assert.equal(shouldHighlightJson('{}', 'application/problem+json'), true);
});

test('preserves exact input, escape sequences, whitespace and trailing newlines', () => {
  const samples = [
    '{\r\n  "key": "escaped \\" quote", "n": -1.25e+3, "ok": true, "nil": null\r\n}\n',
    '{"unfinished": "hello',
    '{"emoji": "🙂", "html": "<script>alert(1)</script>"}\n\n',
    '{"token": "{{apiKey}}", "limit": {{limit}}}',
    '',
  ];
  for (const source of samples) {
    assert.equal(tokenizeJson(source)?.map(({ text }) => text).join(''), source);
  }
});

test('identifies keys, strings, numeric values and literals without splitting variables', () => {
  const tokens = tokenizeJson('{"key" : "{{token}}", "n": -1.2e3, "ok": true, "x": {{value}}}');
  assert.ok(tokens?.some(({ text, kind }) => text === '"key"' && kind === 'key'));
  assert.ok(tokens?.some(({ text, kind }) => text === '"{{token}}"' && kind === 'string'));
  assert.ok(tokens?.some(({ text, kind }) => text === '-1.2e3' && kind === 'number'));
  assert.ok(tokens?.some(({ text, kind }) => text === 'true' && kind === 'literal'));
  assert.ok(tokens?.some(({ text, kind }) => text === '{{value}}' && kind === undefined));
});

test('falls back for large inputs and excessive token counts', () => {
  assert.equal(tokenizeJson('x'.repeat(MAX_JSON_HIGHLIGHT_LENGTH + 1)), null);
  assert.equal(tokenizeJson('[' + '1,'.repeat(5_000) + ']'), null);
});
