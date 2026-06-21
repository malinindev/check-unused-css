import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  spyOn,
  test,
} from 'bun:test';
import { extractCssClasses } from './extractCssClasses.js';
import * as extractClassNamesFromRuleModule from './utils/extractClassNamesFromRule.js';

describe('extractCssClasses', () => {
  let extractClassNamesFromRuleSpy: Mock<
    (typeof extractClassNamesFromRuleModule)['extractClassNamesFromRule']
  >;

  beforeEach(() => {
    extractClassNamesFromRuleSpy = spyOn(
      extractClassNamesFromRuleModule,
      'extractClassNamesFromRule'
    ).mockReturnValue([]);
  });

  afterEach(() => {
    extractClassNamesFromRuleSpy.mockRestore();
  });

  describe('should extract class names from CSS content', () => {
    test('extracts class names from single rule', () => {
      extractClassNamesFromRuleSpy.mockReturnValue(['container']);

      const css = '.container { color: blue; }';
      const result = extractCssClasses(css);

      expect(result).toEqual(['container']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1);
    });

    test('extracts class names from multiple rules', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['text']);

      const css = `
        .container { color: blue; }
        .button { padding: 10px; }
        .text { font-size: 16px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'button', 'text']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
    });

    test('extracts multiple class names from single rule', () => {
      extractClassNamesFromRuleSpy.mockReturnValue([
        'container',
        'active',
        'large',
      ]);

      const css = '.container.active.large { color: blue; }';
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'active', 'large']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1);
    });

    test('handles empty CSS content', () => {
      const css = '';
      const result = extractCssClasses(css);

      expect(result).toEqual([]);
      expect(extractClassNamesFromRuleSpy).not.toHaveBeenCalled();
    });

    test('handles CSS without class rules', () => {
      const css = `
        body { margin: 0; }
        h1 { font-size: 24px; }
        #header { background: blue; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual([]);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('should handle duplicate class names', () => {
    test('removes duplicate class names from different rules', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['container', 'button'])
        .mockReturnValueOnce(['button']);

      const css = `
        .container { color: blue; }
        .container.button { padding: 10px; }
        .button { font-size: 16px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'button']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
    });

    test('removes duplicate class names from same rule', () => {
      extractClassNamesFromRuleSpy.mockReturnValue([
        'container',
        'container',
        'button',
      ]);

      const css = '.container { color: blue; }';
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'button']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1);
    });

    test('handles many duplicate class names across multiple rules', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['a', 'b', 'c'])
        .mockReturnValueOnce(['b', 'c', 'd'])
        .mockReturnValueOnce(['c', 'd', 'e'])
        .mockReturnValueOnce(['a', 'e']);

      const css = `
        .a.b.c { color: blue; }
        .b.c.d { padding: 10px; }
        .c.d.e { margin: 5px; }
        .a.e { font-size: 16px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('should keep locally-defined composed classes (issue #83)', () => {
    // A class referenced by `composes:` that is also defined in this file is a
    // real class — it must stay in the defined set so a direct read of it
    // resolves. (Whether it is "unused" is decided later, not here.)
    test('keeps a composed target that is defined in the file', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['baseButton'])
        .mockReturnValueOnce(['primaryButton'])
        .mockReturnValueOnce(['secondaryButton']);

      const css = `
        .baseButton { padding: 10px; }
        .primaryButton { composes: baseButton; background: blue; }
        .secondaryButton { composes: baseButton; background: gray; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual([
        'baseButton',
        'primaryButton',
        'secondaryButton',
      ]);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
    });

    test('keeps multiple composed targets that are defined in the file', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['base', 'theme'])
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['input']);

      const css = `
        .base { margin: 0; }
        .theme { color: blue; }
        .button { composes: base theme; }
        .input { composes: base; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['base', 'theme', 'button', 'input']);
    });

    test('an external composes target is not invented as a defined class', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['input']);

      // `external` lives in another module; it has no rule here, so it is never
      // a defined class — and the `from`/path tokens must not leak either.
      const css = `
        .button { composes: external from './other.module.css'; padding: 10px; }
        .input { margin: 5px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['button', 'input']);
    });
  });

  describe('should handle complex CSS structures', () => {
    test('handles CSS with media queries', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['mobile']);

      const css = `
        .container { width: 100%; }
        @media (max-width: 768px) {
          .mobile { display: block; }
        }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'mobile']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(2);
    });

    test('handles CSS with keyframes', () => {
      // PostCSS parses keyframes and creates rules for 'from' and 'to' as well
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce([]) // from rule
        .mockReturnValueOnce([]) // to rule
        .mockReturnValueOnce(['animated']); // .animated rule

      const css = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animated { animation: fadeIn 1s; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['animated']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
    });

    test('handles CSS with nested at-rules', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['dark'])
        .mockReturnValueOnce(['light']);

      const css = `
        .container { width: 100%; }
        @supports (display: grid) {
          .dark { background: black; }
          @media (prefers-color-scheme: light) {
            .light { background: white; }
          }
        }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'dark', 'light']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('should handle edge cases', () => {
    test('handles CSS with comments', () => {
      extractClassNamesFromRuleSpy.mockReturnValueOnce(['button']);

      const css = `
        /* This is a comment */
        .button {
          /* Another comment */
          padding: 10px;
        }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['button']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1);
    });

    test('handles CSS with invalid syntax gracefully', () => {
      extractClassNamesFromRuleSpy.mockReturnValue([]);

      // PostCSS should handle this gracefully
      const css = '.incomplete-rule {';

      expect(() => extractCssClasses(css)).toThrow();
    });

    test('handles very large CSS with many rules', () => {
      const mockCalls = Array.from({ length: 1000 }, (_, i) => [`class${i}`]);
      extractClassNamesFromRuleSpy.mockImplementation(() => {
        const callIndex = extractClassNamesFromRuleSpy.mock.calls.length - 1;
        return mockCalls[callIndex] || [];
      });

      const css = Array.from(
        { length: 1000 },
        (_, i) => `.class${i} { color: blue; }`
      ).join('\n');

      const result = extractCssClasses(css);

      expect(result).toHaveLength(1000);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1000);
    });

    test('handles CSS with no rules but with at-rules', () => {
      const css = `
        @import url('styles.css');
        @charset "UTF-8";
        @namespace url(http://www.w3.org/1999/xhtml);
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual([]);
      expect(extractClassNamesFromRuleSpy).not.toHaveBeenCalled();
    });
  });

  describe('should preserve order and handle integration', () => {
    test('returns classes in order of first appearance', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['z', 'a'])
        .mockReturnValueOnce(['m', 'b'])
        .mockReturnValueOnce(['x', 'c']);

      const css = `
        .z.a { color: blue; }
        .m.b { padding: 10px; }
        .x.c { margin: 5px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['z', 'a', 'm', 'b', 'x', 'c']);
    });

    test('integration test with realistic CSS and composed classes', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['base', 'component'])
        .mockReturnValueOnce(['primary'])
        .mockReturnValueOnce(['secondary'])
        .mockReturnValueOnce(['large', 'size']);

      // `base`/`component` are defined locally and composed into others; they
      // remain in the defined set (issue #83 — they are not stripped out).
      const css = `
        .base.component { padding: 10px; border: 1px solid; }
        .primary { composes: base component; background: blue; }
        .secondary { composes: base component; background: gray; }
        .large.size { font-size: 18px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual([
        'base',
        'component',
        'primary',
        'secondary',
        'large',
        'size',
      ]);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(4);
    });
  });
});
