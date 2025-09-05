import { describe, expect, test } from 'bun:test';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';

describe('clearGlobalSelectors', () => {
  describe('should remove :global() selectors', () => {
    test('removes single :global() selector', () => {
      const input = '.class :global(.global-class)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('removes multiple :global() selectors', () => {
      const input = '.class :global(.global1) :global(.global2)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('removes :global() with complex selectors inside', () => {
      const input = '.class :global(.global-class > .nested)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('removes :global() with multiple classes inside', () => {
      const input = '.class :global(.global1.global2)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('removes :global() with pseudo-selectors inside', () => {
      const input = '.class :global(.global:hover)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });
  });

  describe('should remove & references', () => {
    test('removes single & reference', () => {
      const input = '.class & .nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });

    test('removes multiple & references', () => {
      const input = '& .class & .nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });

    test('removes & at the beginning', () => {
      const input = '&.class';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('removes & in the middle', () => {
      const input = '.parent & .child';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.parent .child');
    });
  });

  describe('should handle combined cases', () => {
    test('removes both :global() and & references', () => {
      const input = '& .class :global(.global) & .nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });

    test('removes :global() containing & references', () => {
      const input = '.class :global(& .global)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('handles complex nested structures', () => {
      const input = '& .parent :global(.global > &) .child';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.parent .child');
    });
  });

  describe('should normalize whitespace', () => {
    test('removes extra spaces', () => {
      const input = '.class    .nested     .deep';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested .deep');
    });

    test('trims leading and trailing spaces', () => {
      const input = '   .class .nested   ';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });

    test('handles tabs and newlines', () => {
      const input = '.class\t\n.nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });

    test('normalizes whitespace after removing :global() and &', () => {
      const input = '.class   :global(.global)   &   .nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });
  });

  describe('should handle edge cases', () => {
    test('returns empty string for empty input', () => {
      const result = clearGlobalSelectors('');
      expect(result).toBe('');
    });

    test('returns empty string for whitespace-only input', () => {
      const result = clearGlobalSelectors('   ');
      expect(result).toBe('');
    });

    test('returns empty string when only :global() selectors', () => {
      const result = clearGlobalSelectors(
        ':global(.global1) :global(.global2)'
      );
      expect(result).toBe('');
    });

    test('returns empty string when only & references', () => {
      const result = clearGlobalSelectors('& & &');
      expect(result).toBe('');
    });

    test('handles selector with only :global() and &', () => {
      const result = clearGlobalSelectors('& :global(.global) &');
      expect(result).toBe('');
    });

    test('preserves valid CSS selectors', () => {
      const input = '.class .nested:hover > .child';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested:hover > .child');
    });

    test('handles complex real-world selectors', () => {
      const input = '& .container :global(.global-header) .title & .subtitle';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.container .title .subtitle');
    });
  });

  describe('should handle malformed input gracefully', () => {
    test('handles unclosed :global(', () => {
      const input = '.class :global(.global';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class :global(.global');
    });

    test('handles empty :global()', () => {
      const input = '.class :global()';
      const result = clearGlobalSelectors(input);
      // Empty :global() are not removed as the regex requires at least one character inside
      expect(result).toBe('.class :global()');
    });

    test('handles nested parentheses in :global()', () => {
      const input = '.class :global(.global:not(.excluded))';
      const result = clearGlobalSelectors(input);
      // Regex removes only up to the first closing parenthesis
      expect(result).toBe('.class )');
    });

    test('handles multiple spaces between selectors', () => {
      const input = '.class        :global(.global)        &        .nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });
  });
});
