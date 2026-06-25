import { describe, expect, test } from 'bun:test';
import { stripLeadingCombinators } from './stripLeadingCombinators.js';

describe('stripLeadingCombinators', () => {
  describe('should strip a leading combinator', () => {
    test('child combinator (>)', () => {
      expect(stripLeadingCombinators('> .item')).toBe('.item');
    });

    test('adjacent sibling combinator (+)', () => {
      expect(stripLeadingCombinators('+ .sibling')).toBe('.sibling');
    });

    test('general sibling combinator (~)', () => {
      expect(stripLeadingCombinators('~ .general')).toBe('.general');
    });

    test('combinator with no space before the class', () => {
      expect(stripLeadingCombinators('>.item')).toBe('.item');
    });

    test('strips a leading combinator from each member of a list', () => {
      expect(stripLeadingCombinators('> .item, + .other')).toBe(
        '.item, .other'
      );
    });
  });

  describe('should leave non-leading combinators untouched', () => {
    test('combinator in the middle of a selector', () => {
      expect(stripLeadingCombinators('.wrapper > .item')).toBe(
        '.wrapper > .item'
      );
    });

    test('plain descendant selector', () => {
      expect(stripLeadingCombinators('.wrapper .item')).toBe('.wrapper .item');
    });

    test('single class', () => {
      expect(stripLeadingCombinators('.item')).toBe('.item');
    });

    test('member without a leading combinator stays as-is within a list', () => {
      expect(stripLeadingCombinators('.item, > .other')).toBe('.item, .other');
    });

    test('a comma inside a functional pseudo-class is not a member boundary', () => {
      // The comma in `:not(.x, .y)` lives inside parens, so it is not a
      // top-level list separator; the member never restarts and nothing inside
      // is rewritten.
      expect(stripLeadingCombinators('.item:not(.x, .y)')).toBe(
        '.item:not(.x, .y)'
      );
    });

    test('preserves commas and whitespace inside an attribute value', () => {
      // A comma inside a quoted attribute value (`rgb(0,0,0)`) must stay
      // byte-for-byte; the scan only acts on top-level member starts.
      expect(stripLeadingCombinators('.item[style*="rgb(0,0,0)"]')).toBe(
        '.item[style*="rgb(0,0,0)"]'
      );
    });

    test('strips the leading combinator but keeps a following attribute value intact', () => {
      expect(stripLeadingCombinators('> .item[data-x="p,q"]')).toBe(
        '.item[data-x="p,q"]'
      );
    });
  });

  describe('should handle edge cases', () => {
    test('empty string', () => {
      expect(stripLeadingCombinators('')).toBe('');
    });

    test('combinator with only whitespace after it', () => {
      expect(stripLeadingCombinators('> ')).toBe('');
    });
  });
});
