import {
  test,
  describe,
  expect,
  spyOn,
  beforeEach,
  afterEach,
  type Mock,
} from 'bun:test';
import { findUnusedClasses } from './findUnusedClasses.js';
import * as checkHasDynamicUsageModule from './utils/checkHasDynamicUsage.js';
import * as contentToAstModule from './utils/contentToAst.js';

describe('findUnusedClasses', () => {
  let checkHasDynamicUsageSpy: Mock<
    (typeof checkHasDynamicUsageModule)['checkHasDynamicUsage']
  >;

  let contentToAstSpy: Mock<(typeof contentToAstModule)['contentToAst']>;

  beforeEach(() => {
    checkHasDynamicUsageSpy = spyOn(
      checkHasDynamicUsageModule,
      'checkHasDynamicUsage'
    ).mockReturnValue(false);

    // We spy on contentToAst but let it call through to the real implementation by default
    contentToAstSpy = spyOn(contentToAstModule, 'contentToAst');
  });

  afterEach(() => {
    checkHasDynamicUsageSpy.mockRestore();
    contentToAstSpy.mockRestore();
  });

  describe('should handle dynamic usage detection', () => {
    test('returns early when dynamic usage is detected', () => {
      checkHasDynamicUsageSpy.mockReturnValue(true);

      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: 'const className = styles[dynamicKey];',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: true,
        unusedClasses: null,
      });
      expect(checkHasDynamicUsageSpy).toHaveBeenCalledWith(
        'const className = styles[dynamicKey];',
        ['styles']
      );
      expect(contentToAstSpy).not.toHaveBeenCalled();
    });

    test('continues with AST analysis when no dynamic usage', () => {
      checkHasDynamicUsageSpy.mockReturnValue(false);

      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles.button;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
      });
      expect(checkHasDynamicUsageSpy).toHaveBeenCalledWith(
        'const className = styles.button;',
        ['styles']
      );
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
      });
    });

    test('finds used classes with multiple import names', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text', 'header'],
        tsContent: 'const className = styles.button; const other = css.text;',
        importNames: ['styles', 'css'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['header'],
      });
    });

    test('handles multiple usages of same class', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const a = styles.button; const b = styles.button;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
      });
    });

    test('ignores similar variable names', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const mystyles = {}; const className = styles.button;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
      });
    });
  });

  describe('should detect bracket notation usage', () => {
    test('finds used classes with single quotes', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: "const className = styles['button'];",
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
      });
    });

    test('finds used classes with double quotes', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: 'const className = styles["button"];',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
      });
    });

    test('handles classes with special characters', () => {
      const result = findUnusedClasses({
        cssClasses: ['button-primary', 'text_large', 'header'],
        tsContent:
          'const className = styles["button-primary"]; const other = styles.text_large;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['header'],
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
      });
    });
  });

  describe('should handle edge cases', () => {
    test('returns all classes as unused when none are used', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text', 'header'],
        tsContent: 'const someCode = "hello world";',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button', 'text', 'header'],
      });
    });

    test('handles empty CSS classes array', () => {
      const result = findUnusedClasses({
        cssClasses: [],
        tsContent: 'const className = styles.button;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
      });
    });

    test('handles empty import names array', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles.button;',
        importNames: [],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button'],
      });
    });

    test('handles empty TypeScript content', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: '',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button', 'text'],
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button'], // button is in string literal, not actual usage
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
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
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['unused'],
      });
    });
  });

  describe('should properly call dependencies', () => {
    test('calls checkHasDynamicUsage with correct parameters', () => {
      const tsContent = 'const className = styles[key];';
      const importNames = ['styles'];

      findUnusedClasses({
        cssClasses: ['button'],
        tsContent,
        importNames,
      });

      expect(checkHasDynamicUsageSpy).toHaveBeenCalledWith(
        tsContent,
        importNames
      );
    });

    test('calls contentToAst with TypeScript content', () => {
      const tsContent = 'const className = styles.button;';

      findUnusedClasses({
        cssClasses: ['button'],
        tsContent,
        importNames: ['styles'],
      });

      expect(contentToAstSpy).toHaveBeenCalledWith(tsContent);
    });

    test('does not call contentToAst when dynamic usage is detected', () => {
      checkHasDynamicUsageSpy.mockReturnValue(true);

      findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles[key];',
        importNames: ['styles'],
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
        });
      }).toThrow(errorMessage);
    });
  });
});
