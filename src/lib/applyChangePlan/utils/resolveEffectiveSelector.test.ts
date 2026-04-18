import { describe, expect, test } from 'bun:test';
import type { Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import { resolveEffectiveSelector } from './resolveEffectiveSelector.js';

const findRule = (source: string, selectorSubstring: string): Rule => {
  const root = postcssScss.parse(source);
  let found: Rule | undefined;
  root.walkRules((rule) => {
    if (!found && rule.selector.includes(selectorSubstring)) {
      found = rule;
    }
  });
  if (!found) throw new Error(`No rule containing "${selectorSubstring}"`);
  return found;
};

describe('resolveEffectiveSelector', () => {
  test('top-level single selector → itself', () => {
    const rule = findRule('.card { color: red }', '.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.card']);
  });

  test('top-level comma list → each selector', () => {
    const rule = findRule('.a, .b, .card { color: red }', '.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a', '.b', '.card']);
  });

  test('nested `&.child` inside single parent', () => {
    const rule = findRule('.a { &.card { color: red } }', '&.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a.card']);
  });

  test('nested descendant `.child` without & inside parent', () => {
    const rule = findRule('.a { .card { color: red } }', '.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a .card']);
  });

  test('Cartesian product over comma-list parent with `&`', () => {
    const rule = findRule('.a, .b { &.card { color: red } }', '&.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a.card', '.b.card']);
  });

  test('deep nesting with & at innermost', () => {
    const rule = findRule('.a { .b { &.card { color: red } } }', '&.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a .b.card']);
  });

  test('deep nesting with descendant at innermost', () => {
    const rule = findRule('.a { .b { .card { color: red } } }', '.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a .b .card']);
  });

  test('rule inside @media wrapper is treated as top-level (at-rule skipped)', () => {
    const rule = findRule('@media print { .card { color: red } }', '.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.card']);
  });

  test('rule inside `.parent { @media { &.card { } } }` resolves correctly', () => {
    const rule = findRule(
      '.parent { @media print { &.card { color: red } } }',
      '&.card'
    );
    expect(resolveEffectiveSelector(rule)).toEqual(['.parent.card']);
  });

  test('ampersand in middle of selector — e.g. `.x &.y`', () => {
    const rule = findRule('.a { .x &.y { color: red } }', '&.y');
    expect(resolveEffectiveSelector(rule)).toEqual(['.x .a.y']);
  });

  test('child comma list with & substitution', () => {
    const rule = findRule('.a { &.card, &.other { color: red } }', '&.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a.card', '.a.other']);
  });

  test('nested selector with combinator (`&:hover`)', () => {
    const rule = findRule('.a { &:hover { color: red } }', '&:hover');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a:hover']);
  });

  test('child combinator as part of nested selector (`.a { &>span { } }`)', () => {
    const rule = findRule('.a { & > span { color: red } }', '& >');
    expect(resolveEffectiveSelector(rule)).toEqual(['.a > span']);
  });

  test('rule inside a mixin body falls back to as-authored (mixin is at-rule)', () => {
    const rule = findRule('@mixin foo { .card { color: red } }', '.card');
    expect(resolveEffectiveSelector(rule)).toEqual(['.card']);
  });
});
