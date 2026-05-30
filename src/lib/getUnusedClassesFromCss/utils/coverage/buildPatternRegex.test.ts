import { describe, expect, test } from 'bun:test';
import { buildPatternRegex } from './buildPatternRegex.js';

const matches = (quasis: string[], className: string): boolean => {
  const built = buildPatternRegex(quasis);
  if (!built) {
    throw new Error('expected a pattern, got null (coversAll)');
  }
  return built.regex.test(className);
};

describe('buildPatternRegex', () => {
  describe('prefix only: `btn-{x}` -> `^btn-.*$`', () => {
    // quasis for `btn-{x}` are ['btn-', '']
    const quasis = ['btn-', ''];

    test('source is anchored (hyphen is not a metachar, left literal)', () => {
      expect(buildPatternRegex(quasis)?.source).toBe('^btn-.*$');
    });

    test('matches prefixed class names', () => {
      expect(matches(quasis, 'btn-primary')).toBe(true);
      expect(matches(quasis, 'btn-a-b-c')).toBe(true);
    });

    test('empty wildcard matches bare prefix `btn-`', () => {
      expect(matches(quasis, 'btn-')).toBe(true);
    });

    test('wildcard matches dashes (no false positive on btn-secondary-large)', () => {
      expect(matches(quasis, 'btn-secondary-large')).toBe(true);
    });

    test('rejects non-prefixed names', () => {
      expect(matches(quasis, 'icon')).toBe(false);
      expect(matches(quasis, 'abtn-x')).toBe(false);
      expect(matches(quasis, 'btn')).toBe(false);
    });

    test('anchored: no substring match', () => {
      expect(matches(quasis, 'x-btn-y')).toBe(false);
      expect(matches(quasis, 'btn-y-z')).toBe(true);
    });
  });

  describe('middle const: `a-{x}-b` -> `^a-.*-b$` (prefix/suffix overlap)', () => {
    // quasis for `a-{x}-b` are ['a-', '-b']
    const quasis = ['a-', '-b'];

    test('matches a-foo-b and empty-wildcard a--b', () => {
      expect(matches(quasis, 'a-foo-b')).toBe(true);
      expect(matches(quasis, 'a--b')).toBe(true);
      expect(matches(quasis, 'a-b-b')).toBe(true);
    });

    test('rejects a-b (cannot be produced) and unrelated', () => {
      expect(matches(quasis, 'a-b')).toBe(false);
      expect(matches(quasis, 'aa-foo-b')).toBe(false);
    });
  });

  describe('multi-substitution: `a-{x}-{y}` -> `^a-.*-.*$`', () => {
    // quasis for `a-{x}-{y}` are ['a-', '-', '']
    const quasis = ['a-', '-', ''];

    test('matches when all const segments present in order', () => {
      expect(matches(quasis, 'a-x-y')).toBe(true);
      expect(matches(quasis, 'a--')).toBe(true);
      expect(matches(quasis, 'a-x-y-z')).toBe(true);
    });

    test('rejects when a const segment is missing', () => {
      expect(matches(quasis, 'a-foo')).toBe(false);
      expect(matches(quasis, 'b-x-y')).toBe(false);
    });
  });

  describe('suffix only: `{x}-suffix` -> `^.*-suffix$`', () => {
    // quasis for `{x}-suffix` are ['', '-suffix']
    const quasis = ['', '-suffix'];

    test('matches suffixed names incl. empty wildcard', () => {
      expect(matches(quasis, 'btn-suffix')).toBe(true);
      expect(matches(quasis, '-suffix')).toBe(true);
    });

    test('rejects names without the dash-suffix', () => {
      expect(matches(quasis, 'suffix')).toBe(false);
      expect(matches(quasis, 'suffixed')).toBe(false);
    });
  });

  describe('regex metacharacters in constants are escaped', () => {
    test('dot is a literal, not a wildcard', () => {
      // `a.b-{x}` -> quasis ['a.b-', '']
      const quasis = ['a.b-', ''];
      expect(matches(quasis, 'a.b-x')).toBe(true);
      expect(matches(quasis, 'aXb-x')).toBe(false);
    });

    test('plus is a literal', () => {
      // `a+{x}` -> quasis ['a+', '']
      const quasis = ['a+', ''];
      expect(matches(quasis, 'a+z')).toBe(true);
      expect(matches(quasis, 'aaaa')).toBe(false);
    });

    test('parens/brackets are literals (repo has such class names)', () => {
      expect(matches(['(x)-', ''], '(x)-y')).toBe(true);
      expect(matches(['(x)-', ''], 'xy')).toBe(false);
      expect(matches(['[a]-', ''], '[a]-y')).toBe(true);
    });
  });

  describe('no constant segments -> null (caller maps to coversAll)', () => {
    test('`{x}` -> quasis ["",""] -> null', () => {
      expect(buildPatternRegex(['', ''])).toBeNull();
    });

    test('`{x}{y}` -> quasis ["","",""] -> null', () => {
      expect(buildPatternRegex(['', '', ''])).toBeNull();
    });
  });

  describe('BEM-shaped patterns (double underscores / modifiers)', () => {
    test('block__{el} -> matches anything with the `__` separator', () => {
      // quasis for `${block}__${el}` are ['', '__', '']
      const quasis = ['', '__', ''];
      expect(matches(quasis, 'button__icon')).toBe(true);
      expect(matches(quasis, '__')).toBe(true);
      expect(matches(quasis, 'noSeparator')).toBe(false);
    });

    test('block__el--{mod} -> requires both `__` and `--`', () => {
      // quasis for `${b}__${e}--${m}` are ['', '__', '--', '']
      const quasis = ['', '__', '--', ''];
      expect(matches(quasis, 'card__title--big')).toBe(true);
      expect(matches(quasis, 'card__title')).toBe(false);
    });

    test('btn__{el} with a constant block prefix', () => {
      // quasis for `btn__${el}` are ['btn__', '']
      const quasis = ['btn__', ''];
      expect(matches(quasis, 'btn__icon')).toBe(true);
      expect(matches(quasis, 'btn__icon--lg')).toBe(true);
      expect(matches(quasis, 'card__icon')).toBe(false);
    });
  });
});
