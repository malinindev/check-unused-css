import { describe, expect, test } from 'bun:test';
import { extractCssClassAncestry } from './extractCssClassAncestry.js';

describe('extractCssClassAncestry', () => {
  describe('dash-suffix concatenation', () => {
    test('links each &-suffix child to its parent class', () => {
      const css = `
        .--orientation {
          &-horizontal { color: red; }
          &-vertical { color: blue; }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.get('--orientation-horizontal')).toBe('--orientation');
      expect(ancestry.get('--orientation-vertical')).toBe('--orientation');
    });
  });

  describe('camelCase-suffix concatenation', () => {
    test('links a camelCase &-suffix child to its parent class', () => {
      const css = `
        .button {
          &Black { color: black; }
          &White { color: white; }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.get('buttonBlack')).toBe('button');
      expect(ancestry.get('buttonWhite')).toBe('button');
    });
  });

  describe('multi-level concatenation', () => {
    test('records a single hop at each level of the chain', () => {
      const css = `
        .--color {
          &-primary {
            &-faded { opacity: 0.5; }
          }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.get('--color-primary')).toBe('--color');
      expect(ancestry.get('--color-primary-faded')).toBe('--color-primary');
    });

    test('records hops for a mixed dash/camel chain', () => {
      const css = `
        .list {
          &Item {
            &-active { color: green; }
          }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.get('listItem')).toBe('list');
      expect(ancestry.get('listItem-active')).toBe('listItem');
    });
  });

  describe('non-concatenation rules produce no link', () => {
    test('descendant nesting (& .child) is not a family link', () => {
      const css = `
        .root {
          & .icon { color: red; }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.has('icon')).toBe(false);
    });

    test('compound modifier (&.--reversed) is not a family link', () => {
      // `&.--reversed` resolves to the standalone class `--reversed`, which is
      // a separate class on the same element — not a suffix-concatenation of
      // the parent — so it must not be linked to the parent.
      const css = `
        .root {
          &.--reversed { color: red; }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.has('--reversed')).toBe(false);
    });

    test('an unrelated top-level class sharing a name prefix is not linked', () => {
      const css = `
        .--orientation {
          &-horizontal { color: red; }
        }
        .--orientationLegacy { color: blue; }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.has('--orientationLegacy')).toBe(false);
      // sanity: the genuine child is still linked
      expect(ancestry.get('--orientation-horizontal')).toBe('--orientation');
    });

    test('a prefix-sharing sibling in the SAME selector list as a suffix-& is not linked', () => {
      // `.buttonLegacy` is a separate selector in the list, not produced by
      // `&Black`; it must not be recorded as a child even though it shares the
      // `button` prefix (otherwise using it would wrongly rescue `.button`).
      const css = `
        .button {
          &Black, .buttonLegacy { color: black; }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.get('buttonBlack')).toBe('button');
      expect(ancestry.has('buttonLegacy')).toBe(false);
    });
  });

  describe('composed classes are excluded', () => {
    test('a composed child does not appear in the ancestry map', () => {
      const css = `
        .--variant {
          &-faded {
            composes: base;
            color: red;
          }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      // `base` is composed-from, never a real child here
      expect(ancestry.has('base')).toBe(false);
    });
  });

  describe('ignored files and lines', () => {
    test('returns an empty map for a file-level ignore directive', () => {
      const css = `
        /* check-unused-css-disable */
        .--orientation {
          &-horizontal { color: red; }
        }
      `;
      const ancestry = extractCssClassAncestry(css);
      expect(ancestry.size).toBe(0);
    });
  });
});
