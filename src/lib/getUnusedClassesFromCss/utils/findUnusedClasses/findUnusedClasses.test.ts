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
import * as checkIsInsideStringLiteralModule from '../../../../utils/checkIsInsideStringLiteral.js';
import * as checkHasDynamicUsageModule from './utils/checkHasDynamicUsage.js';

describe('findUnusedClasses', () => {
  let checkIsInsideStringLiteralSpy: Mock<
    (typeof checkIsInsideStringLiteralModule)['checkIsInsideStringLiteral']
  >;

  let checkHasDynamicUsageSpy: Mock<
    (typeof checkHasDynamicUsageModule)['checkHasDynamicUsage']
  >;

  beforeEach(() => {
    checkIsInsideStringLiteralSpy = spyOn(
      checkIsInsideStringLiteralModule,
      'checkIsInsideStringLiteral'
    ).mockReturnValue(false);

    checkHasDynamicUsageSpy = spyOn(
      checkHasDynamicUsageModule,
      'checkHasDynamicUsage'
    ).mockReturnValue(false);
  });

  afterEach(() => {
    checkIsInsideStringLiteralSpy.mockRestore();
    checkHasDynamicUsageSpy.mockRestore();
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
    });

    test('continues with static analysis when no dynamic usage', () => {
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
    });
  });

  describe('should detect direct usage patterns', () => {
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

    test('handles word boundaries correctly', () => {
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

    test('detects multiple usages of same class', () => {
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

    test('finds used classes with template literals', () => {
      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent: 'const className = styles[`button`];',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['text'],
      });
    });

    test('handles bracket notation with whitespace', () => {
      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles  [  "button"  ];',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
      });
    });
  });

  describe('should handle string literal detection', () => {
    test('ignores usage inside string literals', () => {
      checkIsInsideStringLiteralSpy.mockImplementation(
        (content: string, index: number) => {
          // Mock that "styles.button" is inside string literal
          return content.slice(index, index + 13) === 'styles.button';
        }
      );

      const result = findUnusedClasses({
        cssClasses: ['button', 'text'],
        tsContent:
          'const text = "styles.button"; const className = styles.text;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: ['button'], // button is ignored because it's in string literal
      });
    });

    test('correctly identifies usage outside string literals', () => {
      checkIsInsideStringLiteralSpy.mockImplementation(
        (_content: string, index: number) => {
          // Only the first occurrence is inside string literal
          return index < 20;
        }
      );

      const result = findUnusedClasses({
        cssClasses: ['button'],
        tsContent:
          'console.log("styles.button"); const className = styles.button;',
        importNames: ['styles'],
      });

      expect(result).toEqual({
        hasDynamicUsage: false,
        unusedClasses: [],
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

  describe('should handle complex real-world scenarios', () => {
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

    test('handles conditional usage patterns', () => {
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

    test('handles usage in JSX-like patterns', () => {
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

    test('handles function calls and method chaining', () => {
      const result = findUnusedClasses({
        cssClasses: ['base', 'primary', 'target', 'computed', 'unused'],
        tsContent: `
          const classes = clsx(styles.base, styles.primary);
          const element = document.querySelector('.' + styles.target);
          const computed = getClassName(styles["computed"]);
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
    test('calls checkIsInsideStringLiteral for each match', () => {
      const cleanContent = 'const className = styles.button;';

      findUnusedClasses({
        cssClasses: ['button'],
        tsContent: 'const className = styles.button;',
        importNames: ['styles'],
      });

      expect(checkIsInsideStringLiteralSpy).toHaveBeenCalledWith(
        cleanContent,
        expect.any(Number)
      );
    });

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
  });
});
