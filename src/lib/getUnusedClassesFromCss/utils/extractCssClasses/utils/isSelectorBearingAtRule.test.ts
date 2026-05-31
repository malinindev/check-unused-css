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

    test('@at-root with a class selector in its params', () => {
      // `@at-root .promoted { … }` holds the class in params (no nested rule),
      // so it must be recognized as selector-bearing.
      expect(firstAtRule('@at-root .promoted { color: red; }')).toBe(true);
    });
  });

  describe('SCSS directives are never selector-bearing (false)', () => {
    // Their params contain a dot (module path, mixin call, expression), so the
    // class-token regex matches — but they never define a class.
    test('@include reading a namespaced mixin', () => {
      expect(firstAtRule('@include fonts.body-accent-xs;')).toBe(false);
    });

    test('@use with a module path', () => {
      expect(firstAtRule('@use "styles/mixins/_fonts.scss" as fonts;')).toBe(
        false
      );
    });

    test('@forward with a module path', () => {
      expect(firstAtRule('@forward "src/list.scss";')).toBe(false);
    });

    test('@mixin definition', () => {
      expect(firstAtRule('@mixin body-accent-xs() { color: red; }')).toBe(
        false
      );
    });

    test('@extend referencing a class', () => {
      expect(firstAtRule('@extend .button;')).toBe(false);
    });

    test('@if guarding a nested rule', () => {
      expect(firstAtRule('@if $x == 1 { .a { color: red; } }')).toBe(false);
    });

    test('@each iterating a list', () => {
      expect(
        firstAtRule('@each $name in a.b, c.d { .x { color: red; } }')
      ).toBe(false);
    });

    test('block-form @at-root has empty params (class is in a nested rule)', () => {
      // `@at-root { .x { … } }` carries no selector in params; the `.x` rule is
      // a normal nested node the rule walk handles, so the at-rule is not
      // selector-bearing.
      expect(firstAtRule('@at-root { .x { color: red; } }')).toBe(false);
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

    test('statement-form @value (no block) does NOT make a selector a template', () => {
      // `@value foo: 1;` is a CSS-Modules variable declaration, not a template
      // container, so `.root` is still a real selector-bearing class.
      expect(
        firstAtRule('@responsive .root { @value foo: 1; color: red; }')
      ).toBe(true);
    });
  });

  describe('condition params with stray dots are not selectors (false)', () => {
    test('decimal in a condition is not treated as a class', () => {
      // `.5` / `1.5` — a dot followed by a digit is not a class token.
      expect(
        firstAtRule('@responsive (min-width: 1.5rem) { color: red; }')
      ).toBe(false);
    });

    test('a dot directly followed by a digit is not a class token', () => {
      expect(firstAtRule('@responsive (margin: .5em) { color: red; }')).toBe(
        false
      );
    });
  });
});
