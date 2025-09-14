import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('Components without errors', () => {
  test('shows initial message', () => {
    const result = runCheckUnusedCss('nonexistent');

    expect(result.stdout).toMatch(/Checking for unused CSS classes/);
  });

  test.each([
    'Plain',
    'PlainScss',
    'PlainSass',
    'GlobalClasses',
    'Animations',
    'Complex',
    'Media',
    'Nested',
    'Pseudo',
    'ComposedClasses',
    'Svg',
    'WithApostropheInComment',
    'WithApostropheInText',
    'WithApostropheInText2',
    'WithNotClosedQuote',
    'WithRegex',
    'WithComments',
    'WithScssComments',
    'WithRegexAndComment',
    'AllClassesExist',
  ])(
    'exits with code 0 when no unused classes found for component %s.tsx',
    (folderName) => {
      const result = runCheckUnusedCss(`src/__tests__/noError/${folderName}`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Checking for unused CSS classes/);
    }
  );

  test.each([
    'DynamicWithAnd',
    'DynamicWithCondition',
    'DynamicWithMath',
    'DynamicWithNullish',
    'DynamicWithOr',
    'DynamicWithTemplates',
  ])(
    'exits with code 0 when no unused classes found for component dynamic/%s.tsx',
    (folderName) => {
      const result = runCheckUnusedCss(
        `src/__tests__/noError/dynamic/${folderName}`
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Checking for unused CSS classes/);
    }
  );

  test.each([
    'DynamicWithAnd',
    'DynamicWithCondition',
    'DynamicWithMath',
    'DynamicWithNullish',
    'DynamicWithOr',
    'DynamicWithTemplates',
  ])(
    'shows warning for dynamic used styles component dynamic/%s.tsx',
    (folderName) => {
      const result = runCheckUnusedCss(
        `src/__tests__/noError/dynamic/${folderName}`
      );

      expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
      expect(result.stderr).toMatch(
        /Cannot determine usability when using dynamic class access/
      );
      expect(result.stdout).toMatch(new RegExp(`${folderName}\\.module\\.css`));
    }
  );
});
