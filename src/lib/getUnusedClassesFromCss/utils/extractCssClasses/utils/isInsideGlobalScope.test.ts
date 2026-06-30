import { describe, expect, test } from 'bun:test';
import type { Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import { isInsideGlobalScope } from './isInsideGlobalScope.js';

/** Parse SCSS and return the first rule whose selector matches `selector`. */
const ruleBySelector = (css: string, selector: string): Rule => {
  const root = postcssScss.parse(css);
  let found: Rule | undefined;
  root.walkRules((rule) => {
    if (!found && rule.selector === selector) {
      found = rule;
    }
  });
  if (!found) {
    throw new Error(`No rule with selector "${selector}" in:\n${css}`);
  }
  return found;
};

describe('isInsideGlobalScope', () => {
  test('a top-level rule is not in global scope', () => {
    expect(isInsideGlobalScope(ruleBySelector('.local {}', '.local'))).toBe(
      false
    );
  });

  test('a rule inside a bare `:global {}` block is in global scope', () => {
    const rule = ruleBySelector(':global { .g {} }', '.g');
    expect(isInsideGlobalScope(rule)).toBe(true);
  });

  test('a deeply nested rule inside a `:global {}` block is in global scope', () => {
    const rule = ruleBySelector(':global { .a { .b {} } }', '.b');
    expect(isInsideGlobalScope(rule)).toBe(true);
  });

  test('a rule under a `:global .scoped` switch is in global scope', () => {
    const rule = ruleBySelector(':global .scoped { .deep {} }', '.deep');
    expect(isInsideGlobalScope(rule)).toBe(true);
  });

  test('the function form `:global(.foo)` does NOT put nested rules in global scope', () => {
    const rule = ruleBySelector(':global(.foo) { .bar {} }', '.bar');
    expect(isInsideGlobalScope(rule)).toBe(false);
  });

  test('a sibling rule after a `:global {}` block is not in global scope', () => {
    const rule = ruleBySelector(
      ':global { .g {} } .localAfter {}',
      '.localAfter'
    );
    expect(isInsideGlobalScope(rule)).toBe(false);
  });

  test('a local rule wrapping a `:global {}` block is not itself in global scope', () => {
    const rule = ruleBySelector('.local { :global { .g {} } }', '.local');
    expect(isInsideGlobalScope(rule)).toBe(false);
  });

  test('a rule nested under an at-rule inside a `:global {}` block is in global scope', () => {
    // The `.g` rule's direct parent is the `@media` at-rule, not `:global`, so
    // the ancestor walk must step through the at-rule to find the switch.
    const rule = ruleBySelector(
      ':global { @media (min-width: 1px) { .g {} } }',
      '.g'
    );
    expect(isInsideGlobalScope(rule)).toBe(true);
  });

  test('a rule under an at-rule inside a `:global .scoped` switch is in global scope', () => {
    const rule = ruleBySelector(
      ':global .scoped { @media screen { .deep {} } }',
      '.deep'
    );
    expect(isInsideGlobalScope(rule)).toBe(true);
  });

  test('a rule under an at-rule but NOT inside any `:global` switch is not in global scope', () => {
    const rule = ruleBySelector('@media screen { .local {} }', '.local');
    expect(isInsideGlobalScope(rule)).toBe(false);
  });
});
