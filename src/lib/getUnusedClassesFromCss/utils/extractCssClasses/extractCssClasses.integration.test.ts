import { describe, expect, test } from 'bun:test';
import { extractCssClasses } from './extractCssClasses.js';

/**
 * End-to-end extraction tests that run the REAL pipeline (postcss-scss parse ->
 * extractClassNamesFromRule -> css-selector-parser) without mocking. These cover
 * the modern CSS-Modules selector styles that previously produced false positives:
 * double-dash modifier classes, native CSS Nesting with `&`, SCSS-style suffix
 * concatenation, and selector-bearing custom at-rules (e.g. `@responsive`).
 *
 * Sorting both sides keeps assertions order-independent (extraction order is an
 * implementation detail; the SET of defined classes is what matters).
 */
const extractSorted = (css: string): string[] =>
  [...extractCssClasses(css)].sort();
const sorted = (classNames: string[]): string[] => [...classNames].sort();

describe('extractCssClasses (integration, real pipeline)', () => {
  describe('double-dash modifier classes (US1)', () => {
    test('N1: standalone double-dash modifier', () => {
      expect(extractSorted('.--selected { color: red; }')).toEqual(
        sorted(['--selected'])
      );
    });

    test('N2: compound double-dash modifier', () => {
      expect(extractSorted('.root.--variant { color: red; }')).toEqual(
        sorted(['root', '--variant'])
      );
    });

    test('N3: double-dash inside :not() argument', () => {
      expect(
        extractSorted('.--actionable:not(.--selected) { color: red; }')
      ).toEqual(sorted(['--actionable', '--selected']));
    });
  });

  describe('native CSS nesting with & (US2)', () => {
    test('N4: compound modifier joined to parent (&.--reversed)', () => {
      expect(
        extractSorted('.root { color: red; &.--reversed { color: blue; } }')
      ).toEqual(sorted(['root', '--reversed']));
    });

    test('N5: multiple nested modifier blocks', () => {
      expect(
        extractSorted('.root { &.--error { color: red; } &.--disabled {} }')
      ).toEqual(sorted(['root', '--error', '--disabled']));
    });

    test('N6: deep nesting with descendant then modifier', () => {
      expect(
        extractSorted('.root { & .area { &.--visible { color: red; } } }')
      ).toEqual(sorted(['root', 'area', '--visible']));
    });

    test('C7 (no regression): descendant nesting still works', () => {
      expect(extractSorted('.toast { & .icon { color: red; } }')).toEqual(
        sorted(['toast', 'icon'])
      );
    });

    test('C10 (no regression): &.otherClass captures the modifier', () => {
      expect(
        extractSorted('.usedClass { &.otherClass { color: red; } }')
      ).toEqual(sorted(['usedClass', 'otherClass']));
    });
  });

  describe('selector-bearing custom at-rules (US3)', () => {
    test('A1: @responsive selector with attribute matcher', () => {
      expect(
        extractSorted(
          '@responsive .item[style*="--rs-grid-area"] { display: block; }'
        )
      ).toEqual(sorted(['item']));
    });

    test('A2: @responsive selector targeting .root with attribute matcher', () => {
      expect(
        extractSorted('@responsive .root[style*="--rs-w-"] { width: 1px; }')
      ).toEqual(sorted(['root']));
    });

    test('A3: @responsive @value container is a template (selector skipped) but real nested classes are kept', () => {
      // `--hidden` is a responsive-value template (reached only via
      // `responsiveClassNames(s, "--hidden", …)`, never `s["--hidden"]`), so its
      // selector is NOT extracted. The nested `&.--visibility` IS a real class
      // (accessed as `s["--visibility"]`) and must still be extracted.
      expect(
        extractSorted(
          '@responsive .--hidden { @value true { display: none; &.--visibility { display: contents; } } }'
        )
      ).toEqual(sorted(['--visibility']));
    });

    test('A4: @responsive @value container selector is skipped (build-time template)', () => {
      expect(
        extractSorted('@responsive .--size { @value small { color: red; } }')
      ).toEqual([]);
    });

    test('A4b: statement-form @value does not make the selector a template', () => {
      // `@value foo: 1;` is a CSS-Modules variable, not a template container, so
      // `.root` is still extracted as a real class.
      expect(
        extractSorted('@responsive .root { @value foo: 1; color: red; }')
      ).toEqual(sorted(['root']));
    });

    test('A5: @responsive with a condition (no class) invents nothing', () => {
      expect(
        extractSorted('@responsive (min-width: 1px) { color: red; }')
      ).toEqual([]);
    });

    test('A5b: @responsive condition with a decimal invents nothing', () => {
      expect(
        extractSorted('@responsive (min-width: 1.5rem) { color: red; }')
      ).toEqual([]);
    });

    test('A5c: @responsive condition containing url() with a dot invents nothing', () => {
      // The cheap detector may let `url(a.b)` through, but the selector parser
      // finds no class in a condition, so nothing is invented.
      expect(
        extractSorted('@responsive (foo: url(a.b)) { color: red; }')
      ).toEqual([]);
    });

    test('A6 (no regression): class inside a standard @media rule', () => {
      expect(
        extractSorted('@media (--bp) { .item[style*="x"] { color: red; } }')
      ).toEqual(sorted(['item']));
    });
  });

  describe('SCSS suffix concatenation under a compound parent (US4)', () => {
    test('T1: &-suffix joins to the last class of `.root.--variant`', () => {
      expect(
        extractSorted(
          '.root.--variant { &-faded { color: red; } &-outline { color: blue; } }'
        )
      ).toEqual(
        sorted(['root', '--variant', '--variant-faded', '--variant-outline'])
      );
    });

    test('T1: does not derive the wrong `root-faded` name', () => {
      expect(extractCssClasses('.root.--variant { &-faded {} }')).not.toContain(
        'root-faded'
      );
    });

    test('T2: &-size suffixes join to `.root.--size`', () => {
      expect(
        extractSorted('.root.--size { &-small {} &-medium {} &-large {} }')
      ).toEqual(
        sorted([
          'root',
          '--size',
          '--size-small',
          '--size-medium',
          '--size-large',
        ])
      );
    });

    test('T3: compound parent with a single trailing modifier', () => {
      expect(extractSorted('.root.--color-positive { color: red; }')).toEqual(
        sorted(['root', '--color-positive'])
      );
    });

    test('T4: &-suffix ignores a dot-prefixed token in the parent attribute value', () => {
      // The `.foo` inside the attribute value must not be mistaken for the
      // parent class; `&-bar` joins to `item`, yielding `item-bar`.
      expect(
        extractSorted('.item[style*=".foo"] { &-bar { color: red; } }')
      ).toEqual(sorted(['item', 'item-bar']));
    });
  });

  describe('comprehensive: all patterns combined', () => {
    test('extracts the full defined-class set from a mixed stylesheet', () => {
      const css = `
        .root {
          display: flex;
          &.--reversed { flex-direction: row-reverse; }
          & .icon { width: 16px; }
        }

        .root.--variant {
          &-faded { background: #eee; }
          &-outline { background: none; }
        }

        @responsive .item[style*="--grid-area"] {
          display: block;
        }

        @responsive .--display {
          @value true {
            display: none;
            &.--visibility { visibility: hidden; }
          }
        }

        .plain { color: red; }
      `;

      // `--display` is a responsive-value template (has @value children) and is
      // intentionally NOT extracted; the nested `&.--visibility` IS a real class.
      expect(extractSorted(css)).toEqual(
        sorted([
          'root',
          '--reversed',
          'icon',
          '--variant',
          '--variant-faded',
          '--variant-outline',
          'item',
          '--visibility',
          'plain',
        ])
      );
    });
  });

  describe('SCSS directives never leak their params as classes', () => {
    // Regression: `@include fonts.body-accent-xs;` and `@use "…/_fonts.scss"`
    // carry a dot in their params, which a class-token check alone misread as a
    // class. The directive names are now recognized, so only real classes show.
    test('@use + @include namespaced mixins yield no phantom class', () => {
      const css = `
        @use "styles/mixins/_fonts.scss" as fonts;
        @use "styles/mixins/_a11y.scss" as a11y;

        .tooltip-content {
          @include fonts.body-accent-xs;
          position: absolute;
        }

        .visually-hidden {
          @include a11y.visually-hidden;
        }
      `;

      expect(extractSorted(css)).toEqual(
        sorted(['tooltip-content', 'visually-hidden'])
      );
    });

    test('@mixin definition body contributes no class from its name', () => {
      const css = `
        @mixin body-accent-xs() {
          font-size: 12px;
        }

        .real { @include body-accent-xs; }
      `;

      expect(extractSorted(css)).toEqual(sorted(['real']));
    });

    test('@apply pulls in no class; only the host rule class is kept', () => {
      // Load-bearing: if `apply` is dropped from the denylist (or the at-rule
      // walk regresses), the dotted utilities would leak as phantom classes.
      expect(extractSorted('.x { @apply .text-center; }')).toEqual(
        sorted(['x'])
      );
      expect(extractSorted('.x { @apply .a .b; }')).toEqual(sorted(['x']));
    });

    test('@custom-selector params are not extracted as classes', () => {
      // Documents that a @custom-selector alias never surfaces its referenced
      // classes at the extraction level (the selector parser already declines
      // the `:--heading .h1, .h2` params; the denylist is belt-and-suspenders).
      expect(extractSorted('@custom-selector :--heading .h1, .h2;')).toEqual(
        []
      );
    });

    test('@at-root .promoted is a real class (selector held in params)', () => {
      const css = `
        .wrapper {
          @at-root .promoted { color: red; }
        }

        @at-root {
          .blockForm { color: blue; }
        }
      `;

      expect(extractSorted(css)).toEqual(
        sorted(['wrapper', 'promoted', 'blockForm'])
      );
    });

    test('@at-root with a (with:/without:) query still yields its class', () => {
      // The query group precedes the real selector; it must be stripped so the
      // class is seen, not swallowed by the selector parser.
      const css = `
        .a { @at-root (without: media) .escaped { color: red; } }
        .b { @at-root (with: rule) .scoped { color: blue; } }
      `;

      expect(extractSorted(css)).toEqual(
        sorted(['a', 'b', 'escaped', 'scoped'])
      );
    });

    test('@at-root query: multi-selector, "media all", and odd spacing', () => {
      const css = `
        @at-root (without: media) .qa, .qb { color: red; }
        @at-root (without: media all) .allq { color: red; }
        @at-root (  WITH : rule  ) .spaced { color: red; }
      `;

      expect(extractSorted(css)).toEqual(
        sorted(['qa', 'qb', 'allq', 'spaced'])
      );
    });

    test('@at-root query with no selector keeps only the nested class', () => {
      // `(without: media)` then a block of rules — the query yields no class,
      // the nested `.inner` is a normal rule the walk handles.
      const css = '@at-root (without: media) { .inner { color: red; } }';

      expect(extractSorted(css)).toEqual(sorted(['inner']));
    });

    test('uppercase directive names are matched case-insensitively', () => {
      // `@AT-ROOT` is selector-bearing; `@MEDIA` is denylisted regardless of case.
      const css = `
        @AT-ROOT .upper { color: red; }
        @MEDIA (min-width: 1px) { .inMedia { color: red; } }
      `;

      expect(extractSorted(css)).toEqual(sorted(['upper', 'inMedia']));
    });
  });
});
