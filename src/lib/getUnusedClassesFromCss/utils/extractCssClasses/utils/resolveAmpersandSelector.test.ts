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

  describe('should resolve the last class of a compound parent', () => {
    // SCSS suffix concatenation (`&-faded`) joins to the IMMEDIATE parent class,
    // which is the rightmost class token of a compound parent selector. For
    // `.root.--variant { &-faded { … } }` the resulting class is
    // `--variant-faded` (matching how source accesses it: `s[`--variant-${x}`]`),
    // not `root-faded`.
    test('resolves the last class of `.root.--variant`', () => {
      const rule = createMockRule('&-faded', {
        type: 'rule',
        selector: '.root.--variant',
      });
      expect(getParentClassName(rule)).toBe('--variant');
    });

    test('resolves the last class of `.root.--size`', () => {
      const rule = createMockRule('&-small', {
        type: 'rule',
        selector: '.root.--size',
      });
      expect(getParentClassName(rule)).toBe('--size');
    });

    test('resolves the last class of a three-class compound', () => {
      const rule = createMockRule('&Suffix', {
        type: 'rule',
        selector: '.a.b.c',
      });
      expect(getParentClassName(rule)).toBe('c');
    });

    test('single-class parent is unaffected (last === first)', () => {
      const rule = createMockRule('&-x', {
        type: 'rule',
        selector: '.root',
      });
      expect(getParentClassName(rule)).toBe('root');
    });

    test('single-class parent with pseudo is unaffected', () => {
      const rule = createMockRule('&-x', {
        type: 'rule',
        selector: '.usedClass:hover',
      });
      expect(getParentClassName(rule)).toBe('usedClass');
    });

    test('ignores a dot-prefixed token inside an attribute value', () => {
      const rule = createMockRule('&-bar', {
        type: 'rule',
        selector: '.item[style*=".foo"]',
      });
      expect(getParentClassName(rule)).toBe('item');
    });

    test('ignores a class inside a :not() argument', () => {
      const rule = createMockRule('&-suffix', {
        type: 'rule',
        selector: '.real:not(.fake)',
      });
      expect(getParentClassName(rule)).toBe('real');
    });

    test('uses the last class of the right-most compound in a descendant selector', () => {
      const rule = createMockRule('&-x', {
        type: 'rule',
        selector: '.a .b.c',
      });
      expect(getParentClassName(rule)).toBe('c');
    });

    test('uses the last selector in a selector list', () => {
      const rule = createMockRule('&-x', {
        type: 'rule',
        selector: '.a, .b',
      });
      expect(getParentClassName(rule)).toBe('b');
    });
  });
});
