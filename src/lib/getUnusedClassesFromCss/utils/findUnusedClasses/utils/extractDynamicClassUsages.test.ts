import { describe, expect, test } from 'bun:test';
import { extractDynamicClassUsages } from './extractDynamicClassUsages.js';

describe('extractDynamicClassUsages', () => {
  const importNames = ['styles', 'classes'];

  describe('should return dynamic usages for dynamic patterns', () => {
    test('detects template strings with variables', () => {
      const sourceContent =
        // biome-ignore lint/suspicious/noTemplateCurlyInString: for test
        'const className = styles[`prefix${variable}suffix`];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.className).toBe(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: for test
        'styles[`prefix${variable}suffix`]'
      );
    });

    test('detects simple variables without quotes', () => {
      const sourceContent = 'const className = styles[variable];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects function calls', () => {
      const sourceContent = 'const className = styles[getClassName()];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects logical OR expressions', () => {
      const sourceContent =
        'const className = styles[test || fallback || "default"];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects nullish coalescing operator', () => {
      const sourceContent = 'const className = styles[test ?? "fallback"];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects ternary operator', () => {
      const sourceContent =
        'const className = styles[condition ? "active" : "inactive"];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects logical AND expressions', () => {
      const sourceContent =
        'const className = styles[condition && "conditionalClass"];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects mathematical operations', () => {
      const operations = [
        'const className = styles[prefix + "suffix"];',
        'const className = styles[base - offset];',
        'const className = styles[count * 2];',
        'const className = styles[total / 3];',
      ];

      for (const sourceContent of operations) {
        const result = extractDynamicClassUsages(
          sourceContent,
          importNames,
          'test.tsx'
        );
        expect(result.length).toBeGreaterThan(0);
      }
    });

    test('detects object property access', () => {
      const sourceContent = 'const className = styles[config.theme];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects array access', () => {
      const sourceContent = 'const className = styles[classNames[0]];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects method calls in brackets', () => {
      const sourceContent = 'const className = styles[obj.getClassName()];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects complex nested expressions', () => {
      const sourceContent =
        'const className = styles[obj.method() || fallback ?? "default"];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('works with different import names', () => {
      const sourceContent = 'const className = classes[variable];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('detects multiple dynamic usages in same content', () => {
      const sourceContent = `
        const className1 = styles[variable1];
        const className2 = styles[variable2 || "fallback"];
      `;
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('should return empty array for static usage patterns', () => {
    test('static string literals', () => {
      const sourceContent = 'const className = styles["staticClass"];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBe(0);
    });

    test('static property access', () => {
      const sourceContent = 'const className = styles.staticClass;';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBe(0);
    });

    test('template strings without variables', () => {
      const sourceContent = 'const className = styles[`staticString`];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBe(0);
    });

    test('no styles usage at all', () => {
      const sourceContent = 'const className = "regular-class";';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBe(0);
    });

    test('styles usage outside of brackets', () => {
      const sourceContent = 'const obj = { styles: "something" };';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBe(0);
    });

    test('empty content', () => {
      const result = extractDynamicClassUsages('', importNames, 'test.tsx');
      expect(result.length).toBe(0);
    });

    test('import name not in provided list', () => {
      const sourceContent = 'const className = otherStyles[variable];';
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBe(0);
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

      for (const sourceContent of variations) {
        const result = extractDynamicClassUsages(
          sourceContent,
          importNames,
          'test.tsx'
        );
        expect(result.length).toBeGreaterThan(0);
      }
    });

    test('handles newlines in expressions', () => {
      const sourceContent = `
        const className = styles[
          condition
            ? "active"
            : "inactive"
        ];
      `;
      const result = extractDynamicClassUsages(
        sourceContent,
        importNames,
        'test.tsx'
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test('distinguishes between similar patterns', () => {
      // This should be static
      const staticContent = 'const className = styles["test||fallback"];';
      const staticResult = extractDynamicClassUsages(
        staticContent,
        importNames,
        'test.tsx'
      );
      expect(staticResult.length).toBe(0);

      // This should be dynamic
      const dynamicContent = 'const className = styles[test||fallback];';
      const dynamicResult = extractDynamicClassUsages(
        dynamicContent,
        importNames,
        'test.tsx'
      );
      expect(dynamicResult.length).toBeGreaterThan(0);
    });

    test('handles complex real-world examples', () => {
      const realWorldExamples = [
        // React component with conditional classes
        'className={styles[isActive ? "active" : "inactive"]}',
        // CSS Modules with computed names
        // biome-ignore lint/suspicious/noTemplateCurlyInString: for test
        'const cls = styles[`${prefix}${variant}${size}`];',
        // Fallback patterns
        'const className = styles[props.className || defaultClassName || "fallback"];',
        // Nullish coalescing with object access
        'const cls = styles[theme.primaryColor ?? config.fallback];',
        // Complex ternary with logical operators
        'const cls = styles[isLoading && !hasError ? "loading" : error ? "error" : "normal"];',
      ];

      for (const example of realWorldExamples) {
        const result = extractDynamicClassUsages(
          example,
          importNames,
          'test.tsx'
        );
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});
