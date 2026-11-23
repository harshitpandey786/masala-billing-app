import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDetails, hasDetails, detailsParts } from './masalaDetails.js';

test('emptyDetails starts with a blank note', () => {
  assert.deepEqual(emptyDetails(), { note: '' });
});

test('hasDetails is true only once the note has non-whitespace content', () => {
  assert.equal(hasDetails(emptyDetails()), false);
  assert.equal(hasDetails({ note: '   ' }), false);
  assert.equal(hasDetails({ note: 'extra chilli' }), true);
  assert.equal(hasDetails(undefined), false);
});

test('detailsParts returns the trimmed note as its one part, or nothing', () => {
  assert.deepEqual(detailsParts({ note: '  pack in two bags  ' }), ['pack in two bags']);
  assert.deepEqual(detailsParts(emptyDetails()), []);
});
