import { test, describe, expect } from 'bun:test';
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
    'Dynamic',
    'Svg',
    'WithApostropheInComment',
  ])(
    'exits with code 0 when no unused classes found for component %s.tsx',
    (folderName) => {
      const result = runCheckUnusedCss(`src/__tests__/noError/${folderName}`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Checking for unused CSS classes/);
    }
  );
});
