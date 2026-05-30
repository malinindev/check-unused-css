import { describe, expect, test } from 'bun:test';
import postcssScss from 'postcss-scss';
import { isSelectorBearingAtRule } from './isSelectorBearingAtRule.js';

/** Parse a single at-rule from CSS and hand it to the predicate. */
const firstAtRule = (css: string): boolean => {
  const root = postcssScss.parse(css);
  let result = false;
  let found = false;
  root.walkAtRules((atRule) => {
    if (found) return;
    found = true;
    result = isSelectorBearingAtRule(atRule);
  });
  if (!found) throw new Error('No at-rule found in CSS');
  return result;
};

describe('isSelectorBearingAtRule', () => {
  describe('selector-bearing custom at-rules (true)', () => {
    test('custom at-rule with a class selector', () => {
      expect(firstAtRule('@responsive .item { display: block; }')).toBe(true);
    });

    test('custom at-rule with a class + attribute selector', () => {
      expect(
        firstAtRule('@responsive .item[style*="--x"] { display: block; }')
      ).toBe(true);
    });

    test('custom at-rule with a double-dash class selector', () => {
      expect(firstAtRule('@responsive .--hidden { display: none; }')).toBe(
        true
      );
    });

    test('custom at-rule whose body is a @variable block', () => {
      expect(firstAtRule('@responsive .root { @variable --x auto; }')).toBe(
        true
      );
    });
  });

  describe('standard condition/identifier at-rules (false)', () => {
    test('@media is never selector-bearing', () => {
      expect(
        firstAtRule('@media (min-width: 1px) { .x { color: red; } }')
      ).toBe(false);
    });

    test('@supports is never selector-bearing', () => {
      expect(
        firstAtRule('@supports (display: grid) { .x { color: red; } }')
      ).toBe(false);
    });

    test('@container is never selector-bearing', () => {
      expect(firstAtRule('@container (min-width: 1px) { .x {} }')).toBe(false);
    });

    test('@keyframes is never selector-bearing', () => {
      expect(firstAtRule('@keyframes spin { from {} to {} }')).toBe(false);
    });

    test('@layer is never selector-bearing', () => {
      expect(firstAtRule('@layer base { .x {} }')).toBe(false);
    });
  });

  describe('params without a class token (false)', () => {
    test('custom at-rule used purely as a condition wrapper', () => {
      expect(firstAtRule('@responsive (min-width: 1px) { color: red; }')).toBe(
        false
      );
    });
  });

  describe('responsive-value containers are templates (false)', () => {
    test('@responsive with @value children is skipped', () => {
      expect(
        firstAtRule('@responsive .--size { @value small { color: red; } }')
      ).toBe(false);
    });

    test('@responsive with multiple @value children is skipped', () => {
      expect(
        firstAtRule(
          '@responsive .--type { @value literal { width: 1px; } @value unit { width: 2px; } }'
        )
      ).toBe(false);
    });
  });
});
