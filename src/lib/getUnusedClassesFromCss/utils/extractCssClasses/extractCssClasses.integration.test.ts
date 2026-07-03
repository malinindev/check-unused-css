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

  describe('combinator before a trailing & (issue #96)', () => {
    // A nested selector where a combinator sits directly before the trailing
    // `&` — `.skipLink + &` means "this element, when preceded by a sibling
    // `.skipLink`". Removing `&` for parsing used to leave a dangling trailing
    // combinator (`.skipLink +`), which the selector parser rejects, dropping
    // every class in the rule. The sibling class must still be extracted.
    test('B1: adjacent sibling before & (.skipLink + &)', () => {
      expect(
        extractSorted('.target { .skipLink + & { color: blue; } }')
      ).toEqual(sorted(['target', 'skipLink']));
    });

    test('B2: general sibling before & (.sib ~ &)', () => {
      expect(extractSorted('.target { .sib ~ & { color: blue; } }')).toEqual(
        sorted(['target', 'sib'])
      );
    });

    test('B3: child combinator before & (.parent > &)', () => {
      expect(extractSorted('.target { .parent > & { color: blue; } }')).toEqual(
        sorted(['target', 'parent'])
      );
    });

    test('B4: combinator with no space before & (.sib+&)', () => {
      expect(extractSorted('.target { .sib+& { color: blue; } }')).toEqual(
        sorted(['target', 'sib'])
      );
    });

    test('B5: combinators on both sides of & (.a + & + .b)', () => {
      expect(extractSorted('.target { .a + & + .b { color: blue; } }')).toEqual(
        sorted(['target', 'a', 'b'])
      );
    });

    test('B6: trailing & inside a selector list (.a + &, .b ~ &)', () => {
      expect(
        extractSorted('.target { .a + &, .b ~ & { color: blue; } }')
      ).toEqual(sorted(['target', 'a', 'b']));
    });

    test('B7: sibling-before-& nested two levels deep', () => {
      expect(extractSorted('.a { .b + & { .c + & { color: red; } } }')).toEqual(
        sorted(['a', 'b', 'c'])
      );
    });

    test('B8 (no regression): combinator before & followed by a descendant', () => {
      // Here `&` is not trailing (`.foo + & .bar`), which already worked; guard
      // it so the fix does not regress the mid-selector case.
      expect(
        extractSorted('.target { .foo + & .bar { color: red; } }')
      ).toEqual(sorted(['target', 'foo', 'bar']));
    });

    test('B9 (no regression): leading combinator before a class still works', () => {
      expect(extractSorted('.target { & + .after { color: red; } }')).toEqual(
        sorted(['target', 'after'])
      );
    });

    test('B10: an escaped quote in the sibling attribute value before &', () => {
      // The escaped `"` inside the attribute value must not confuse the dangling
      // combinator strip; `.item` is still recovered from `.item[…] + &`.
      expect(
        extractSorted('.target { .item[title="a\\"b"] + & { color: red; } }')
      ).toEqual(sorted(['target', 'item']));
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

  describe(':global block and switch forms scope classes globally (issue #91)', () => {
    // Bare `:global` (no parens) is a scope switch: everything to its right —
    // in the same selector AND in nested rules — is global, so those classes
    // must NOT be extracted as local. The function form `:global(.foo)` is
    // unaffected (already handled) and is covered by separate regression cases.

    test('class inside a `:global {}` block is not extracted', () => {
      expect(extractSorted(':global { .globalThing { color: red; } }')).toEqual(
        []
      );
    });

    test('local class outside the block is kept; global one is dropped', () => {
      expect(
        extractSorted(
          '.localUsed { color: blue; } :global { .globalThing { color: red; } }'
        )
      ).toEqual(sorted(['localUsed']));
    });

    test('multiple classes inside a `:global {}` block are all dropped', () => {
      expect(
        extractSorted(':global { .a { color: red; } .b { color: blue; } }')
      ).toEqual([]);
    });

    test('deep nesting inside a `:global {}` block stays global', () => {
      expect(extractSorted(':global { .a { .b { color: red; } } }')).toEqual(
        []
      );
    });

    test('bare `:global .scoped` switch keeps no class', () => {
      expect(extractSorted(':global .scoped { color: red; }')).toEqual([]);
    });

    test('nested rule under a `:global .scoped` switch stays global', () => {
      expect(
        extractSorted(':global .scoped { .deep { color: red; } }')
      ).toEqual([]);
    });

    test('local class left of a bare `:global` switch is kept', () => {
      expect(extractSorted('.local :global .after { color: red; }')).toEqual(
        sorted(['local'])
      );
    });

    test('a local block containing a `:global {}` block keeps only the local class', () => {
      expect(
        extractSorted('.local { :global { .globalThing { color: red; } } }')
      ).toEqual(sorted(['local']));
    });

    test('no regression: function form `:global(.foo)` still strips only the global part', () => {
      // `:global(.foo) .bar` → `.foo` global, `.bar` local (stays local even
      // when expressed as a nested block).
      expect(extractSorted(':global(.foo) .bar { color: red; }')).toEqual(
        sorted(['bar'])
      );
      expect(extractSorted(':global(.foo) { .bar { color: red; } }')).toEqual(
        sorted(['bar'])
      );
    });

    test('sibling local rule after a `:global {}` block is still extracted', () => {
      expect(
        extractSorted(
          ':global { .g { color: red; } } .localAfter { color: blue; }'
        )
      ).toEqual(sorted(['localAfter']));
    });

    test('class under an at-rule inside a `:global {}` block stays global', () => {
      // The class is nested under `@media`, whose parent is `:global`; the
      // ancestor walk must step through the at-rule to see the switch.
      expect(
        extractSorted(
          ':global { @media (min-width: 1px) { .g { color: red; } } }'
        )
      ).toEqual([]);
    });

    test('at-rule inside a `:global .scoped` switch stays global', () => {
      expect(
        extractSorted(
          ':global .scoped { @media screen { .deep { color: red; } } }'
        )
      ).toEqual([]);
    });

    test('no regression: a class under an at-rule with no `:global` is local', () => {
      expect(
        extractSorted('@media screen { .localInMedia { color: red; } }')
      ).toEqual(sorted(['localInMedia']));
    });
  });

  describe('nested selectors starting with a combinator', () => {
    test('child combinator (>) at the start of a nested selector', () => {
      expect(extractSorted('.wrapper { > .item { color: red; } }')).toEqual(
        sorted(['wrapper', 'item'])
      );
    });

    test('adjacent sibling combinator (+) at the start', () => {
      expect(extractSorted('.wrapper { + .sibling { color: red; } }')).toEqual(
        sorted(['wrapper', 'sibling'])
      );
    });

    test('general sibling combinator (~) at the start', () => {
      expect(extractSorted('.wrapper { ~ .general { color: red; } }')).toEqual(
        sorted(['wrapper', 'general'])
      );
    });

    test('combinator with no space before the class', () => {
      expect(extractSorted('.wrapper { >.item { color: red; } }')).toEqual(
        sorted(['wrapper', 'item'])
      );
    });

    test('explicit & before the combinator', () => {
      expect(extractSorted('.wrapper { & > .item { color: red; } }')).toEqual(
        sorted(['wrapper', 'item'])
      );
    });

    test('deep nesting where every level starts with a combinator', () => {
      expect(extractSorted('.a { > .b { > .c { color: red; } } }')).toEqual(
        sorted(['a', 'b', 'c'])
      );
    });

    test('leading combinator followed by a descendant chain', () => {
      expect(
        extractSorted('.wrapper { > .item .child { color: red; } }')
      ).toEqual(sorted(['wrapper', 'item', 'child']));
    });

    test('selector list where members start with a combinator', () => {
      expect(
        extractSorted('.wrapper { > .item, + .other { color: red; } }')
      ).toEqual(sorted(['wrapper', 'item', 'other']));
    });

    test('compound class after the leading combinator', () => {
      expect(
        extractSorted('.wrapper { > .item.active { color: red; } }')
      ).toEqual(sorted(['wrapper', 'item', 'active']));
    });

    test('no regression: combinator in the middle still works', () => {
      expect(extractSorted('.wrapper > .item { color: red; }')).toEqual(
        sorted(['wrapper', 'item'])
      );
    });
  });

  describe(':local(...) function form scopes classes locally (issue #97)', () => {
    // The function form `:local(.foo)` explicitly marks its inner classes as
    // local; they must be extracted. This mirrors `:global(.foo)`, whose inner
    // classes are global and are dropped.

    test('single class inside :local(...) is extracted', () => {
      expect(extractSorted(':local(.active) { color: red; }')).toEqual(
        sorted(['active'])
      );
    });

    test('multiple compound classes inside :local(...) are extracted', () => {
      expect(extractSorted(':local(.root.active) { color: red; }')).toEqual(
        sorted(['root', 'active'])
      );
    });

    test('descendant selector inside :local(...) is extracted', () => {
      expect(extractSorted(':local(.a .b) { color: red; }')).toEqual(
        sorted(['a', 'b'])
      );
    });

    test('combinator inside :local(...) is extracted', () => {
      expect(extractSorted(':local(.a > .b) { color: red; }')).toEqual(
        sorted(['a', 'b'])
      );
    });

    test('class trailing the :local(...) form stays local', () => {
      expect(extractSorted(':local(.a) .b { color: red; }')).toEqual(
        sorted(['a', 'b'])
      );
    });

    test('class preceding the :local(...) form stays local', () => {
      expect(extractSorted('.a :local(.b) { color: red; }')).toEqual(
        sorted(['a', 'b'])
      );
    });

    test('double-dash modifier inside :local(...) is extracted', () => {
      expect(extractSorted(':local(.--reversed) { color: red; }')).toEqual(
        sorted(['--reversed'])
      );
    });

    test('a global class nested inside :local(...) is dropped', () => {
      // `clearGlobalSelectors` strips the inner `:global(.g)` textually before
      // parsing, leaving `:local(.a )`, so only the local `.a` survives.
      expect(extractSorted(':local(.a :global(.g)) { color: red; }')).toEqual(
        sorted(['a'])
      );
    });

    test('bare `:local .active` switch form is extracted', () => {
      // Already worked before the fix; guards against regression.
      expect(extractSorted(':local .active { color: red; }')).toEqual(
        sorted(['active'])
      );
    });

    test('nested rules under a :local(...) parent are extracted', () => {
      expect(
        extractSorted(':local(.parent) { &.active { .child { color: red; } } }')
      ).toEqual(sorted(['parent', 'active', 'child']));
    });

    test('selector list of :local(...) members is extracted', () => {
      expect(extractSorted(':local(.a), :local(.b) { color: red; }')).toEqual(
        sorted(['a', 'b'])
      );
    });

    test('SCSS suffix concat under a :local(...) parent is extracted', () => {
      // `&Black` joins to the local parent `button`, producing `buttonBlack`.
      expect(
        extractSorted(':local(.button) { &Black { color: red; } }')
      ).toEqual(sorted(['button', 'buttonBlack']));
    });
  });

  describe(':local re-scoping inside a :global block (issue #101)', () => {
    // A bare `:global {}` block scopes descendants globally, but a `:local(...)`
    // function form (or a bare `:local` switch) nested inside it flips scope back
    // to local. Those local classes must be extracted even though an ancestor
    // opened a global block. Plain classes inside `:global` stay global.

    test('single :local(...) inside a :global block is extracted', () => {
      expect(
        extractSorted(':global { :local(.small) { color: red; } }')
      ).toEqual(sorted(['small']));
    });

    test('empty-bodied :local(...) inside a :global block is extracted', () => {
      // The exact form from the issue report.
      expect(extractSorted(':global { :local(.small) {} }')).toEqual(
        sorted(['small'])
      );
    });

    test('compound :local(...) inside a :global block is extracted', () => {
      expect(
        extractSorted(':global { :local(.root.active) { color: red; } }')
      ).toEqual(sorted(['root', 'active']));
    });

    test('a plain class beside the :local(...) rule stays global', () => {
      // `.g` is a plain class in global scope (dropped); `:local(.l)` re-scopes.
      expect(
        extractSorted(
          ':global { .g { color: red; } :local(.l) { color: blue; } }'
        )
      ).toEqual(sorted(['l']));
    });

    test('a bare `:local` switch inside a :global block re-scopes descendants', () => {
      expect(
        extractSorted(':global { :local { .small { color: red; } } }')
      ).toEqual(sorted(['small']));
    });

    test('a bare `:local .scoped` switch inside a :global block is local', () => {
      expect(
        extractSorted(':global { :local .scoped { color: red; } }')
      ).toEqual(sorted(['scoped']));
    });

    test('nested rule under a bare `:local` switch inside :global stays local', () => {
      expect(
        extractSorted(':global { :local { .a { .b { color: red; } } } }')
      ).toEqual(sorted(['a', 'b']));
    });

    test(':local(...) inside a `:global .scoped` switch is extracted', () => {
      expect(
        extractSorted(':global .scoped { :local(.deep) { color: red; } }')
      ).toEqual(sorted(['deep']));
    });

    test(':local(...) under an at-rule inside a :global block is extracted', () => {
      expect(
        extractSorted(
          ':global { @media (min-width: 1px) { :local(.m) { color: red; } } }'
        )
      ).toEqual(sorted(['m']));
    });

    test('a plain class nested one level under :local(...) inside :global stays global', () => {
      // The `:local(.a)` FUNCTION form scopes only `.a`; it is not a bare switch,
      // so its nested plain `.b` inherits the enclosing `:global` scope → global.
      expect(
        extractSorted(':global { :local(.a) { .b { color: red; } } }')
      ).toEqual(sorted(['a']));
    });

    test('a nested :local(...) under a plain class inside :global is extracted', () => {
      expect(
        extractSorted(':global { .a { :local(.b) { color: red; } } }')
      ).toEqual(sorted(['b']));
    });

    test('local class outside a :global block is unaffected by an inner :local', () => {
      expect(
        extractSorted('.outer { color: green; } :global { :local(.x) {} }')
      ).toEqual(sorted(['outer', 'x']));
    });

    test('no regression: plain classes inside :global are still dropped', () => {
      expect(
        extractSorted(':global { .a { color: red; } .b { color: blue; } }')
      ).toEqual([]);
    });

    test('double-dash modifier via :local(...) inside :global is extracted', () => {
      expect(
        extractSorted(':global { :local(.--variant) { color: red; } }')
      ).toEqual(sorted(['--variant']));
    });
  });
});
