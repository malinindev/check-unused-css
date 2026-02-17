import { describe, expect, test } from 'bun:test';
import type { Rule } from 'postcss';
import {
  getParentClassName,
  resolveAmpersandSelector,
} from './resolveAmpersandSelector.js';

const createMockRule = (
  selector: string,
  parent?: { type: string; selector?: string; parent?: unknown }
): Rule =>
  ({
    selector,
    parent,
  }) as Rule;

describe('resolveAmpersandSelector', () => {
  describe('should resolve & concatenation with parent class', () => {
    test('resolves camelCase suffix', () => {
      expect(resolveAmpersandSelector('&Suffix', 'usedClass')).toBe(
        '.usedClassSuffix'
      );
    });

    test('resolves BEM element suffix', () => {
      expect(resolveAmpersandSelector('&__element', 'block')).toBe(
        '.block__element'
      );
    });

    test('resolves BEM modifier suffix', () => {
      expect(resolveAmpersandSelector('&--modifier', 'block')).toBe(
        '.block--modifier'
      );
    });

    test('resolves hyphen suffix', () => {
      expect(resolveAmpersandSelector('&-suffix', 'usedClass')).toBe(
        '.usedClass-suffix'
      );
    });

    test('resolves numeric suffix', () => {
      expect(resolveAmpersandSelector('&2', 'usedClass')).toBe('.usedClass2');
    });

    test('resolves underscore suffix', () => {
      expect(resolveAmpersandSelector('&_suffix', 'usedClass')).toBe(
        '.usedClass_suffix'
      );
    });
  });

  describe('should not resolve & before pseudo-classes', () => {
    test('keeps &:hover unchanged', () => {
      expect(resolveAmpersandSelector('&:hover', 'usedClass')).toBe('&:hover');
    });

    test('keeps &::before unchanged', () => {
      expect(resolveAmpersandSelector('&::before', 'usedClass')).toBe(
        '&::before'
      );
    });

    test('keeps &.otherClass unchanged', () => {
      expect(resolveAmpersandSelector('&.otherClass', 'usedClass')).toBe(
        '&.otherClass'
      );
    });

    test('keeps & followed by space unchanged', () => {
      expect(resolveAmpersandSelector('& .child', 'usedClass')).toBe(
        '& .child'
      );
    });

    test('keeps standalone & unchanged', () => {
      expect(resolveAmpersandSelector('&', 'usedClass')).toBe('&');
    });
  });

  describe('should return selector unchanged when no parent', () => {
    test('returns selector when parentClassName is null', () => {
      expect(resolveAmpersandSelector('&Suffix', null)).toBe('&Suffix');
    });

    test('returns plain selector when parentClassName is null', () => {
      expect(resolveAmpersandSelector('.usedClass', null)).toBe('.usedClass');
    });
  });

  describe('should handle multiple & in one selector', () => {
    test('resolves multiple concatenations', () => {
      expect(resolveAmpersandSelector('&Suffix, &Suffix2', 'usedClass')).toBe(
        '.usedClassSuffix, .usedClassSuffix2'
      );
    });

    test('resolves concatenation mixed with pseudo', () => {
      expect(resolveAmpersandSelector('&Suffix:hover', 'usedClass')).toBe(
        '.usedClassSuffix:hover'
      );
    });
  });
});

describe('getParentClassName', () => {
  describe('should return null when no parent rule', () => {
    test('returns null for root-level rule', () => {
      const rule = createMockRule('.usedClass');
      expect(getParentClassName(rule)).toBeNull();
    });

    test('returns null when parent is not a rule', () => {
      const rule = createMockRule('&Suffix', { type: 'root' });
      expect(getParentClassName(rule)).toBeNull();
    });
  });

  describe('should extract parent class name', () => {
    test('extracts simple parent class', () => {
      const rule = createMockRule('&Suffix', {
        type: 'rule',
        selector: '.usedClass',
      });
      expect(getParentClassName(rule)).toBe('usedClass');
    });

    test('extracts parent class with pseudo-selector', () => {
      const rule = createMockRule('&Suffix', {
        type: 'rule',
        selector: '.usedClass:hover',
      });
      expect(getParentClassName(rule)).toBe('usedClass');
    });
  });

  describe('should resolve multi-level nesting', () => {
    test('resolves two-level & concatenation', () => {
      const grandParent = {
        type: 'rule',
        selector: '.usedClass',
        parent: { type: 'root' },
      };
      const parent = {
        type: 'rule',
        selector: '&Nested',
        parent: grandParent,
      };
      const rule = createMockRule('&Deep', parent);

      expect(getParentClassName(rule)).toBe('usedClassNested');
    });

    test('resolves three-level & concatenation', () => {
      const greatGrandParent = {
        type: 'rule',
        selector: '.root',
        parent: { type: 'root' },
      };
      const grandParent = {
        type: 'rule',
        selector: '&Level1',
        parent: greatGrandParent,
      };
      const parent = {
        type: 'rule',
        selector: '&Level2',
        parent: grandParent,
      };
      const rule = createMockRule('&Level3', parent);

      expect(getParentClassName(rule)).toBe('rootLevel1Level2');
    });
  });

  describe('should handle mixed nesting', () => {
    test('returns direct parent class when parent has no &', () => {
      const grandParent = {
        type: 'rule',
        selector: '.root',
        parent: { type: 'root' },
      };
      const parent = {
        type: 'rule',
        selector: '.nested',
        parent: grandParent,
      };
      const rule = createMockRule('&Suffix', parent);

      expect(getParentClassName(rule)).toBe('nested');
    });
  });
});
