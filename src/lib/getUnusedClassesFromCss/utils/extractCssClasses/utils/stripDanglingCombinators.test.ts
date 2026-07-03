import { describe, expect, test } from 'bun:test';
import { stripDanglingCombinators } from './stripDanglingCombinators.js';

describe('stripDanglingCombinators', () => {
  describe('should strip a leading combinator', () => {
    test('child combinator (>)', () => {
      expect(stripDanglingCombinators('> .item')).toBe('.item');
    });

    test('adjacent sibling combinator (+)', () => {
      expect(stripDanglingCombinators('+ .sibling')).toBe('.sibling');
    });

    test('general sibling combinator (~)', () => {
      expect(stripDanglingCombinators('~ .general')).toBe('.general');
    });

    test('combinator with no space before the class', () => {
      expect(stripDanglingCombinators('>.item')).toBe('.item');
    });

    test('strips a leading combinator from each member of a list', () => {
      expect(stripDanglingCombinators('> .item, + .other')).toBe(
        '.item, .other'
      );
    });
  });

  describe('should strip a trailing combinator (issue #96)', () => {
    test('adjacent sibling combinator left by a trailing &', () => {
      // `.skipLink + &` -> `.skipLink +` once `&` is removed.
      expect(stripDanglingCombinators('.skipLink +')).toBe('.skipLink');
    });

    test('general sibling combinator', () => {
      expect(stripDanglingCombinators('.sib ~')).toBe('.sib');
    });

    test('child combinator', () => {
      expect(stripDanglingCombinators('.parent >')).toBe('.parent');
    });

    test('trailing combinator with no space before it', () => {
      expect(stripDanglingCombinators('.sib+')).toBe('.sib');
    });

    test('strips a trailing combinator from each member of a list', () => {
      expect(stripDanglingCombinators('.a +, .b ~')).toBe('.a, .b');
    });
  });

  describe('should collapse combinators orphaned on both sides of a removed &', () => {
    test('two adjacent-sibling combinators become a descendant space', () => {
      // `.a + & + .b` -> `.a + + .b` once `&` is removed.
      expect(stripDanglingCombinators('.a + + .b')).toBe('.a .b');
    });

    test('two child combinators become a descendant space', () => {
      expect(stripDanglingCombinators('.a > > .b')).toBe('.a .b');
    });
  });

  describe('should leave a lone in-between combinator untouched', () => {
    test('child combinator in the middle of a selector', () => {
      expect(stripDanglingCombinators('.wrapper > .item')).toBe(
        '.wrapper > .item'
      );
    });

    test('adjacent sibling combinator in the middle', () => {
      expect(stripDanglingCombinators('.a + .b')).toBe('.a + .b');
    });

    test('plain descendant selector', () => {
      expect(stripDanglingCombinators('.wrapper .item')).toBe('.wrapper .item');
    });

    test('single class', () => {
      expect(stripDanglingCombinators('.item')).toBe('.item');
    });

    test('member without a leading combinator stays as-is within a list', () => {
      expect(stripDanglingCombinators('.item, > .other')).toBe('.item, .other');
    });

    test('a comma inside a functional pseudo-class is not a member boundary', () => {
      // The comma in `:not(.x, .y)` lives inside parens, so it is not a
      // top-level list separator; nothing inside is rewritten.
      expect(stripDanglingCombinators('.item:not(.x, .y)')).toBe(
        '.item:not(.x, .y)'
      );
    });

    test('a combinator inside a functional pseudo-class is not touched', () => {
      expect(stripDanglingCombinators('.item:is(.a + .b)')).toBe(
        '.item:is(.a + .b)'
      );
    });

    test('preserves commas and whitespace inside an attribute value', () => {
      // A comma inside a quoted attribute value (`rgb(0,0,0)`) must stay
      // byte-for-byte; the scan only acts on top-level tokens.
      expect(stripDanglingCombinators('.item[style*="rgb(0,0,0)"]')).toBe(
        '.item[style*="rgb(0,0,0)"]'
      );
    });

    test('a combinator char inside an attribute value is not touched', () => {
      expect(stripDanglingCombinators('.item[data-x="a>b"]')).toBe(
        '.item[data-x="a>b"]'
      );
    });

    test('strips the leading combinator but keeps a following attribute value intact', () => {
      expect(stripDanglingCombinators('> .item[data-x="p,q"]')).toBe(
        '.item[data-x="p,q"]'
      );
    });
  });

  describe('should honor backslash escapes inside attribute values', () => {
    test('an escaped quote does not end the value span (trailing combinator)', () => {
      // `.item[title="a\"b"] + &` -> the escaped `"` must not close the value,
      // otherwise the trailing `+` is not recognized and never dropped.
      expect(stripDanglingCombinators('.item[title="a\\"b"] +')).toBe(
        '.item[title="a\\"b"]'
      );
    });

    test('a comma after an escaped quote stays inside the value (not a member split)', () => {
      expect(stripDanglingCombinators('.real[title="a\\",.fake"] +')).toBe(
        '.real[title="a\\",.fake"]'
      );
    });

    test('an escaped backslash before the closing quote still closes the value', () => {
      expect(stripDanglingCombinators('.item[data-x="a\\\\"] +')).toBe(
        '.item[data-x="a\\\\"]'
      );
    });
  });

  describe('should handle edge cases', () => {
    test('empty string', () => {
      expect(stripDanglingCombinators('')).toBe('');
    });

    test('combinator with only whitespace after it', () => {
      expect(stripDanglingCombinators('> ')).toBe('');
    });

    test('a member that is only a combinator is dropped', () => {
      expect(stripDanglingCombinators('+')).toBe('');
    });
  });
});
