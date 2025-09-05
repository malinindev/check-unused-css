import { describe, expect, test } from 'bun:test';
import type { Rule } from 'postcss';
import { extractClassNamesFromRule } from './extractClassNamesFromRule.js';

const createMockRule = (selector: string): Rule =>
  ({
    selector,
  }) as Rule;

describe('extractClassNamesFromRule', () => {
  describe('should extract class names from simple selectors', () => {
    test('extracts single class name', () => {
      const rule = createMockRule('.container');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['container']);
    });

    test('extracts multiple class names from compound selector', () => {
      const rule = createMockRule('.container.active');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['container', 'active']);
    });

    test('extracts class names from descendant selectors', () => {
      const rule = createMockRule('.parent .child');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['parent', 'child']);
    });

    test('extracts class names from child selectors', () => {
      const rule = createMockRule('.parent > .child');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['parent', 'child']);
    });

    test('extracts class names from sibling selectors', () => {
      const rule = createMockRule('.first + .second');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['first', 'second']);
    });

    test('extracts class names from general sibling selectors', () => {
      const rule = createMockRule('.first ~ .second');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['first', 'second']);
    });
  });

  describe('should handle complex selectors', () => {
    test('extracts class names from pseudo-class selectors', () => {
      const rule = createMockRule('.button:hover');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['button']);
    });

    test('extracts class names from pseudo-element selectors', () => {
      const rule = createMockRule('.text::before');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['text']);
    });

    test('extracts class names from attribute selectors', () => {
      const rule = createMockRule('.input[type="text"]');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['input']);
    });

    test('extracts class names from complex nested selectors', () => {
      const rule = createMockRule('.header .nav .item:hover > .link');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['header', 'nav', 'item', 'link']);
    });

    test('extracts class names from multiple selectors', () => {
      const rule = createMockRule('.button, .link, .text');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['button', 'link', 'text']);
    });

    test('extracts class names from mixed selectors', () => {
      const rule = createMockRule('.header h1, .footer .text, div.container');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['header', 'footer', 'text', 'container']);
    });
  });

  describe('should handle selectors with :global() and & references', () => {
    test('extracts class names after removing :global() selectors', () => {
      const rule = createMockRule('.container :global(.global-class) .local');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['container', 'local']);
    });

    test('extracts class names after removing & references', () => {
      const rule = createMockRule('& .container .nested');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['container', 'nested']);
    });

    test('extracts class names after removing both :global() and &', () => {
      const rule = createMockRule('& .parent :global(.global) .child');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['parent', 'child']);
    });

    test('handles complex CSS Modules selectors', () => {
      const rule = createMockRule(
        '&.active :global(.theme-dark) .button.primary'
      );
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['active', 'button', 'primary']);
    });
  });

  describe('should handle edge cases', () => {
    test('returns empty array for selectors without class names', () => {
      const rule = createMockRule('div');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('returns empty array for element selectors', () => {
      const rule = createMockRule('h1, p, span');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('returns empty array for ID selectors', () => {
      const rule = createMockRule('#header');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('ignores ID selectors but extracts class names', () => {
      const rule = createMockRule('#header .container');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['container']);
    });

    test('handles universal selector', () => {
      const rule = createMockRule('* .container');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['container']);
    });

    test('handles empty selector', () => {
      const rule = createMockRule('');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('handles whitespace-only selector', () => {
      const rule = createMockRule('   ');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });
  });

  describe('should handle malformed selectors gracefully', () => {
    test('returns empty array for invalid selectors', () => {
      const rule = createMockRule('.class[invalid');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('returns empty array for unclosed brackets', () => {
      const rule = createMockRule('.class:not(.other');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('returns empty array for malformed pseudo-selectors', () => {
      const rule = createMockRule('.class::');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([]);
    });

    test('handles selectors with special characters', () => {
      const rule = createMockRule('.class-name_123');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['class-name_123']);
    });

    test('handles selectors with escaped characters', () => {
      const rule = createMockRule('.class\\:hover');
      const result = extractClassNamesFromRule(rule);
      // CSS parser unescapes the characters
      expect(result).toEqual(['class:hover']);
    });
  });

  describe('should handle real-world CSS examples', () => {
    test('extracts class names from BEM methodology', () => {
      const rule = createMockRule('.block__element--modifier');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['block__element--modifier']);
    });

    test('extracts class names from utility classes', () => {
      const rule = createMockRule('.text-center.font-bold.text-lg');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['text-center', 'font-bold', 'text-lg']);
    });

    test('extracts class names from responsive selectors', () => {
      const rule = createMockRule('.container .md\\:flex .lg\\:hidden');
      const result = extractClassNamesFromRule(rule);
      // CSS parser unescapes the characters
      expect(result).toEqual(['container', 'md:flex', 'lg:hidden']);
    });

    test('extracts class names from complex component selectors', () => {
      const rule = createMockRule(
        '.card .card-header .card-title, .card .card-body .card-text'
      );
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual([
        'card',
        'card-header',
        'card-title',
        'card',
        'card-body',
        'card-text',
      ]);
    });

    test('extracts class names from CSS-in-JS generated selectors', () => {
      const rule = createMockRule('.css-1234567 .css-abcdefg:hover');
      const result = extractClassNamesFromRule(rule);
      expect(result).toEqual(['css-1234567', 'css-abcdefg']);
    });
  });
});
