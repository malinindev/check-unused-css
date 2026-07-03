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

  describe('should drop combinators orphaned by removing & (issue #96)', () => {
    test('drops a trailing combinator left by a trailing & (adjacent sibling)', () => {
      // `.skipLink + &` -> after removing `&`, the `+` has no right operand.
      expect(clearGlobalSelectors('.skipLink + &')).toBe('.skipLink');
    });

    test('drops a trailing general-sibling combinator', () => {
      expect(clearGlobalSelectors('.sib ~ &')).toBe('.sib');
    });

    test('drops a trailing child combinator', () => {
      expect(clearGlobalSelectors('.parent > &')).toBe('.parent');
    });

    test('drops a trailing combinator with no space before &', () => {
      expect(clearGlobalSelectors('.sib+&')).toBe('.sib');
    });

    test('collapses combinators left on both sides of a removed &', () => {
      // `.a + & + .b` -> both `+` around `&` lose an operand; the two compounds
      // must remain, separated by a single descendant combinator.
      expect(clearGlobalSelectors('.a + & + .b')).toBe('.a .b');
    });

    test('drops trailing combinators in every member of a list', () => {
      expect(clearGlobalSelectors('.a + &, .b ~ &')).toBe('.a, .b');
    });

    test('a mid-selector & leaves a parseable combinator (.foo + & .bar)', () => {
      // Here `&` is not trailing: after removal `.foo + .bar` is a perfectly
      // valid selector, indistinguishable from an authored `.foo + .bar`. Both
      // yield the same class set (`foo`, `bar`), so leaving the `+` is fine —
      // this case never needed the fix and must not regress into a broken form.
      expect(clearGlobalSelectors('.foo + & .bar')).toBe('.foo + .bar');
    });

    test('keeps a real in-between combinator that never touched & (.wrapper > .item)', () => {
      expect(clearGlobalSelectors('.wrapper > .item')).toBe('.wrapper > .item');
    });
  });

  describe('should handle malformed input gracefully', () => {
    test('handles unclosed :global(', () => {
      const input = '.class :global(.global';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('handles empty :global()', () => {
      const input = '.class :global()';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('handles nested parentheses in :global()', () => {
      const input = '.class :global(.global:not(.excluded))';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class');
    });

    test('handles :has() inside :global()', () => {
      const input = ':global(body:has(.class) .class2)';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('');
    });

    test('handles multiple spaces between selectors', () => {
      const input = '.class        :global(.global)        &        .nested';
      const result = clearGlobalSelectors(input);
      expect(result).toBe('.class .nested');
    });
  });
});
