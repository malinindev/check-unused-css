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
