import { test, describe, expect } from 'bun:test';
import { checkHasDynamicUsage } from './checkHasDynamicUsage.js';

describe('checkHasDynamicUsage', () => {
  const importNames = ['styles', 'classes'];

  describe('should return true for dynamic usage patterns', () => {
    test('detects template strings with variables', () => {
      const tsContent = 'const className = styles[`prefix${variable}suffix`];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects simple variables without quotes', () => {
      const tsContent = 'const className = styles[variable];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects function calls', () => {
      const tsContent = 'const className = styles[getClassName()];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects logical OR expressions', () => {
      const tsContent =
        'const className = styles[test || fallback || "default"];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects nullish coalescing operator', () => {
      const tsContent = 'const className = styles[test ?? "fallback"];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects ternary operator', () => {
      const tsContent =
        'const className = styles[condition ? "active" : "inactive"];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects logical AND expressions', () => {
      const tsContent =
        'const className = styles[condition && "conditionalClass"];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects mathematical operations', () => {
      const operations = [
        'const className = styles[prefix + "suffix"];',
        'const className = styles[base - offset];',
        'const className = styles[count * 2];',
        'const className = styles[total / 3];',
      ];

      for (const tsContent of operations) {
        expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
      }
    });

    test('detects object property access', () => {
      const tsContent = 'const className = styles[config.theme];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects array access', () => {
      const tsContent = 'const className = styles[classNames[0]];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects method calls in brackets', () => {
      const tsContent = 'const className = styles[obj.getClassName()];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects complex nested expressions', () => {
      const tsContent =
        'const className = styles[obj.method() || fallback ?? "default"];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('works with different import names', () => {
      const tsContent = 'const className = classes[variable];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('detects multiple dynamic usages in same content', () => {
      const tsContent = `
        const className1 = styles[variable1];
        const className2 = styles[variable2 || "fallback"];
      `;
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });
  });

  describe('should return false for static usage patterns', () => {
    test('static string literals', () => {
      const tsContent = 'const className = styles["staticClass"];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(false);
    });

    test('static property access', () => {
      const tsContent = 'const className = styles.staticClass;';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(false);
    });

    test('template strings without variables', () => {
      const tsContent = 'const className = styles[`staticString`];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(false);
    });

    test('no styles usage at all', () => {
      const tsContent = 'const className = "regular-class";';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(false);
    });

    test('styles usage outside of brackets', () => {
      const tsContent = 'const obj = { styles: "something" };';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(false);
    });

    test('empty content', () => {
      expect(checkHasDynamicUsage('', importNames)).toBe(false);
    });

    test('import name not in provided list', () => {
      const tsContent = 'const className = otherStyles[variable];';
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles whitespace variations', () => {
      const variations = [
        'styles[ variable ]',
        'styles [variable]',
        'styles[ variable||fallback ]',
        'styles[  condition ? "a" : "b"  ]',
      ];

      for (const tsContent of variations) {
        expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
      }
    });

    test('handles newlines in expressions', () => {
      const tsContent = `
        const className = styles[
          condition
            ? "active"
            : "inactive"
        ];
      `;
      expect(checkHasDynamicUsage(tsContent, importNames)).toBe(true);
    });

    test('distinguishes between similar patterns', () => {
      // This should be static
      const staticContent = 'const className = styles["test||fallback"];';
      expect(checkHasDynamicUsage(staticContent, importNames)).toBe(false);

      // This should be dynamic
      const dynamicContent = 'const className = styles[test||fallback];';
      expect(checkHasDynamicUsage(dynamicContent, importNames)).toBe(true);
    });

    test('handles complex real-world examples', () => {
      const realWorldExamples = [
        // React component with conditional classes
        'className={styles[isActive ? "active" : "inactive"]}',
        // CSS Modules with computed names
        'const cls = styles[`${prefix}${variant}${size}`];',
        // Fallback patterns
        'const className = styles[props.className || defaultClassName || "fallback"];',
        // Nullish coalescing with object access
        'const cls = styles[theme.primaryColor ?? config.fallback];',
        // Complex ternary with logical operators
        'const cls = styles[isLoading && !hasError ? "loading" : error ? "error" : "normal"];',
      ];

      for (const example of realWorldExamples) {
        expect(checkHasDynamicUsage(example, importNames)).toBe(true);
      }
    });
  });
});
