import { describe, expect, test } from 'bun:test';
import postcssScss from 'postcss-scss';
import type { Rule } from 'postcss';
import { stripSelectorsFromList } from './stripSelectorsFromList.js';

const firstRule = (source: string): Rule => {
  const root = postcssScss.parse(source);
  let found: Rule | undefined;
  root.walkRules((r) => {
    if (!found) found = r;
  });
  if (!found) throw new Error('no rule in source');
  return found;
};

describe('stripSelectorsFromList', () => {
  test('removes one selector from a three-entry list', () => {
    const rule = firstRule('.used, .card, .other { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBe('.used, .other');
  });

  test('removes first entry', () => {
    const rule = firstRule('.card, .other { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBe('.other');
  });

  test('removes last entry', () => {
    const rule = firstRule('.other, .card { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBe('.other');
  });

  test('returns null when list empties', () => {
    const rule = firstRule('.card { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBeNull();
  });

  test('removes all duplicates of a dead selector', () => {
    const rule = firstRule('.used, .card, .card { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBe('.used');
  });

  test('returns null when list had only duplicates of the dead selector', () => {
    const rule = firstRule('.card, .card { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBeNull();
  });

  test('removes multiple different dead selectors', () => {
    const rule = firstRule('.a, .b, .c, .d { color: red }');
    expect(stripSelectorsFromList(rule, ['.b', '.d'])).toBe('.a, .c');
  });

  test('no matches → returns the same selector list reassembled', () => {
    const rule = firstRule('.a, .b { color: red }');
    expect(stripSelectorsFromList(rule, ['.unrelated'])).toBe('.a, .b');
  });

  test('trims whitespace when comparing', () => {
    const rule = firstRule('.a ,.b , .card { color: red }');
    expect(stripSelectorsFromList(rule, ['.card'])).toBe('.a, .b');
  });

  test('does not mutate the rule (postcss.selector stays unchanged until caller assigns)', () => {
    const rule = firstRule('.used, .card { color: red }');
    stripSelectorsFromList(rule, ['.card']);
    expect(rule.selector).toBe('.used, .card');
  });
});
