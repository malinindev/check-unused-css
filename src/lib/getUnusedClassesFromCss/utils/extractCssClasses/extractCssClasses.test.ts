import {
  test,
  describe,
  expect,
  spyOn,
  beforeEach,
  afterEach,
  type Mock,
} from 'bun:test';
import { extractCssClasses } from './extractCssClasses.js';
import * as extractClassNamesFromRuleModule from './utils/extractClassNamesFromRule.js';
import * as extractComposedClassesModule from './utils/extractComposedClasses.js';

describe('extractCssClasses', () => {
  let extractClassNamesFromRuleSpy: Mock<
    (typeof extractClassNamesFromRuleModule)['extractClassNamesFromRule']
  >;

  let extractComposedClassesSpy: Mock<
    (typeof extractComposedClassesModule)['extractComposedClasses']
  >;

  beforeEach(() => {
    extractClassNamesFromRuleSpy = spyOn(
      extractClassNamesFromRuleModule,
      'extractClassNamesFromRule'
    ).mockReturnValue([]);

    extractComposedClassesSpy = spyOn(
      extractComposedClassesModule,
      'extractComposedClasses'
    ).mockReturnValue([]);
  });

  afterEach(() => {
    extractClassNamesFromRuleSpy.mockRestore();
    extractComposedClassesSpy.mockRestore();
  });

  describe('should extract class names from CSS content', () => {
    test('extracts class names from single rule', () => {
      extractClassNamesFromRuleSpy.mockReturnValue(['container']);
      extractComposedClassesSpy.mockReturnValue([]);

      const css = '.container { color: blue; }';
      const result = extractCssClasses(css);

      expect(result).toEqual(['container']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });

    test('extracts class names from multiple rules', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['text']);

      extractComposedClassesSpy.mockReturnValue([]);

      const css = `
        .container { color: blue; }
        .button { padding: 10px; }
        .text { font-size: 16px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'button', 'text']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });

    test('extracts multiple class names from single rule', () => {
      extractClassNamesFromRuleSpy.mockReturnValue([
        'container',
        'active',
        'large',
      ]);
      extractComposedClassesSpy.mockReturnValue([]);

      const css = '.container.active.large { color: blue; }';
      const result = extractCssClasses(css);

      expect(result).toEqual(['container', 'active', 'large']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1);
    });

    test('handles empty CSS content', () => {
      extractComposedClassesSpy.mockReturnValue([]);

      const css = '';
      const result = extractCssClasses(css);

      expect(result).toEqual([]);
      expect(extractClassNamesFromRuleSpy).not.toHaveBeenCalled();
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });

    test('handles CSS without class rules', () => {
      extractComposedClassesSpy.mockReturnValue([]);

      const css = `
        body { margin: 0; }
        h1 { font-size: 24px; }
        #header { background: blue; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual([]);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('should handle duplicate class names', () => {
    test('removes duplicate class names from different rules', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['container', 'button'])
        .mockReturnValueOnce(['button']);

      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

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

      extractComposedClassesSpy.mockReturnValue([]);

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

  describe('should handle composed classes', () => {
    test('removes composed classes from final result', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['baseButton'])
        .mockReturnValueOnce(['primaryButton'])
        .mockReturnValueOnce(['secondaryButton']);

      extractComposedClassesSpy.mockReturnValue(['baseButton']);

      const css = `
        .baseButton { padding: 10px; }
        .primaryButton { composes: baseButton; background: blue; }
        .secondaryButton { composes: baseButton; background: gray; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['primaryButton', 'secondaryButton']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(3);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });

    test('removes multiple composed classes', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['base', 'theme'])
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['input']);
      extractComposedClassesSpy.mockReturnValue(['base', 'theme']);

      const css = `
        .base { margin: 0; }
        .theme { color: blue; }
        .button { composes: base theme; }
        .input { composes: base; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['button', 'input']);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });

    test('handles case where composed class is not in extracted classes', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['input']);
      extractComposedClassesSpy.mockReturnValue(['nonExistentClass']);

      const css = `
        .button { padding: 10px; }
        .input { margin: 5px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['button', 'input']);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });

    test('handles empty composed classes', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['button'])
        .mockReturnValueOnce(['input']);
      extractComposedClassesSpy.mockReturnValue([]);

      const css = `
        .button { padding: 10px; }
        .input { margin: 5px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['button', 'input']);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('should handle complex CSS structures', () => {
    test('handles CSS with media queries', () => {
      extractClassNamesFromRuleSpy
        .mockReturnValueOnce(['container'])
        .mockReturnValueOnce(['mobile']);
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

      const css = Array.from(
        { length: 1000 },
        (_, i) => `.class${i} { color: blue; }`
      ).join('\n');

      const result = extractCssClasses(css);

      expect(result).toHaveLength(1000);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(1000);
    });

    test('handles CSS with no rules but with at-rules', () => {
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue([]);

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
      extractComposedClassesSpy.mockReturnValue(['base', 'component']);

      const css = `
        .base.component { padding: 10px; border: 1px solid; }
        .primary { composes: base component; background: blue; }
        .secondary { composes: base component; background: gray; }
        .large.size { font-size: 18px; }
      `;
      const result = extractCssClasses(css);

      expect(result).toEqual(['primary', 'secondary', 'large', 'size']);
      expect(extractClassNamesFromRuleSpy).toHaveBeenCalledTimes(4);
      expect(extractComposedClassesSpy).toHaveBeenCalledTimes(1);
    });
  });
});
