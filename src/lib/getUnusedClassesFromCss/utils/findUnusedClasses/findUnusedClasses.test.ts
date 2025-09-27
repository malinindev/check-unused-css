import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  spyOn,
  test,
} from 'bun:test';
import { findUnusedClasses } from './findUnusedClasses.js';
import * as contentToAstModule from './utils/contentToAst.js';

describe('findUnusedClasses', () => {
  let contentToAstSpy: Mock<(typeof contentToAstModule)['contentToAst']>;

  beforeEach(() => {
    // We spy on contentToAst but let it call through to the real implementation by default
    contentToAstSpy = spyOn(contentToAstModule, 'contentToAst');
  });

  afterEach(() => {
    contentToAstSpy.mockRestore();
  });

  describe('should handle dynamic usage detection', () => {
    test('returns early when dynamic usage is detected', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: 'const className = styles[dynamicKey];',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: true,
        unusedClasses: null,
        dynamicUsages: [
          {
            className: 'styles[dynamicKey]',
            file: 'test.tsx',
            line: 1,
            column: 19,
          },
        ],
      });
    });

    test('continues with AST analysis when no dynamic usage', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles.button;',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
        dynamicUsages: null,
      });
      expect(contentToAstSpy).toHaveBeenCalledWith(
        'const className = styles.button;'
      );
    });
  });

  describe('should detect dot notation usage', () => {
    test('finds used classes with direct notation', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: 'const className = styles.button;',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
        dynamicUsages: null,
      });
    });

    test('finds used classes with multiple import names', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text', 'header'],
        tsContent: 'const className = styles.button; const other = css.text;',
        importNames: ['styles', 'css'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['header'],
        dynamicUsages: null,
      });
    });

    test('handles multiple usages of same class', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const a = styles.button; const b = styles.button;',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
        dynamicUsages: null,
      });
    });

    test('ignores similar variable names', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const mystyles = {}; const className = styles.button;',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
        dynamicUsages: null,
      });
    });
  });

  describe('should detect bracket notation usage', () => {
    test('finds used classes with single quotes', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: "const className = styles['button'];",
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
        dynamicUsages: null,
      });
    });

    test('finds used classes with double quotes', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: 'const className = styles["button"];',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
        dynamicUsages: null,
      });
    });

    test('handles classes with special characters', () => {
      const result = findUnusedClasses({
        cssClasses: ['button-primary', 'text_large', 'header'],
        tsContent:
          'const className = styles["button-primary"]; const other = styles.text_large;',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['header'],
        dynamicUsages: null,
      });
    });
  });

  describe('should handle JSX usage patterns', () => {
    test('finds classes used in JSX attributes', () => {
      const result = findUnusedClasses({
        cssClasses: ['container', 'button', 'text-small', 'unused'],
        tsContent: `
          <div className={styles.container}>
            <button className={styles.button}>Click</button>
            <span className={styles['text-small']}>Text</span>
          </div>
        `,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
        dynamicUsages: null,
      });
    });

    test('handles conditional JSX usage', () => {
      const result = findUnusedClasses({
        cssClasses: ['active', 'inactive', 'button', 'unused'],
        tsContent: `
          const className = isActive ? styles.active : styles.inactive;
          const buttonClass = styles["button"];
        `,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
        dynamicUsages: null,
      });
    });

    test('handles complex JSX with apostrophes in text', () => {
      const result = findUnusedClasses({
        cssClasses: ['usedClass1', 'usedClass2', 'unused'],
        tsContent: `
          <div className={styles.usedClass1}>
            The ' character is making
            <span className={styles.usedClass2}>the test fail</span>
          </div>
        `,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
        dynamicUsages: null,
      });
    });
  });

  describe('should handle edge cases', () => {
    test('returns all classes as unused when none are used', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text', 'header'],
        tsContent: 'const someCode = "hello world";',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button', 'text', 'header'],
        dynamicUsages: null,
      });
    });

    test('handles empty CSS classes array', () => {
      const result = findUnusedClasses({
        cssClasses: [],
        tsContent: 'const className = styles.button;',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
        dynamicUsages: null,
      });
    });

    test('handles empty import names array', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles.button;',
        importNames: [],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button'],
        dynamicUsages: null,
      });
    });

    test('handles empty TypeScript content', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: '',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button', 'text'],
        dynamicUsages: null,
      });
    });

    test('correctly handles text content that looks like class usage', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'used'],
        tsContent: `
          const text = 'styles.button should not be detected';
          const className = styles.used;
        `,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button'], // button is in string literal, not actual usage
        dynamicUsages: null,
      });
    });
  });

  describe('should handle complex real-world scenarios', () => {
    test('handles React component with hooks', () => {
      const result = findUnusedClasses({
        cssClasses: ['container', 'activeButton', 'button', 'unused'],
        tsContent: `
          import React, { useState } from 'react';
          
          export const Component = () => {
            const [isActive, setIsActive] = useState(false);

            return (
              <div className={styles.container}>
                <button 
                  className={isActive ? styles.activeButton : styles.button}
                  onClick={() => setIsActive(!isActive)}
                >
                  Toggle
                </button>
              </div>
            );
          };
        `,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
        dynamicUsages: null,
      });
    });

    test('handles mixed usage patterns', () => {
      const result = findUnusedClasses({
        cssClasses: [
          'primaryButton',
          'secondary-text',
          'mainHeader',
          'footer-content',
          'unused',
        ],
        tsContent: `
          const button = styles.primaryButton;
          const text = styles["secondary-text"];
          const header = css.mainHeader;
          const footer = css['footer-content'];
        `,
        importNames: ['styles', 'css'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
        dynamicUsages: null,
      });
    });

    test('handles content with syntax that would break regex parsing', () => {
      const result = findUnusedClasses({
        cssClasses: ['usedClass', 'usedClass2', 'unused'],
        tsContent: `
          const text = 'test error with apostrophe - "';
          return (
            <div className={styles.usedClass}>
              <div className={styles.usedClass2} />
            </div>
          );
        `,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
        dynamicUsages: null,
      });
    });
  });

  describe('should properly call dependencies', () => {
    test('calls extractDynamicClassUsages with correct parameters', () => {
      const tsContent = 'const className = styles[key];';
      const importNames = ['styles'];

      findUnusedClasses({
        cssClasses: ['button'],
        tsContent,
        importNames,
        filePath: 'test.tsx',
      });
    });

    test('calls contentToAst with TypeScript content', () => {
      const tsContent = 'const className = styles.button;';

      findUnusedClasses({
        cssClasses: ['button'],
        tsContent,
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(contentToAstSpy).toHaveBeenCalledWith(tsContent);
    });

    test('does not call contentToAst when dynamic usage is detected', () => {
      findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles[key];',
        importNames: ['styles'],
        filePath: 'test.tsx',
      });

      expect(contentToAstSpy).not.toHaveBeenCalled();
    });
  });

  describe('should handle AST parsing errors', () => {
    test('throws error when contentToAst fails', () => {
      const errorMessage = 'Syntax error: unexpected token';
      contentToAstSpy.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      expect(() => {
        findUnusedClasses({
          cssClasses: ['button'],
          tsContent: 'invalid syntax {[}',
          importNames: ['styles'],
          filePath: 'test.tsx',
        });
      }).toThrow(errorMessage);
    });
  });
});
