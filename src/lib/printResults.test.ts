import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  type Mock,
} from 'bun:test';
import { printResults } from './printResults.js';
import { COLORS } from '../consts.js';
import type { UnusedClassResult } from '../types.js';

describe('printResults', () => {
  let consoleLogSpy: Mock<typeof console.log>;
  let consoleWarnSpy: Mock<typeof console.warn>;
  let consoleErrorSpy: Mock<typeof console.error>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(
      () => undefined
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('when no issues found', () => {
    test('prints success message when no unused classes and no unimported files', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: [],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('does not print success message when there are unimported files', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          status: 'notImported',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        `${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`
      );
    });
  });

  describe('when dynamic usage detected', () => {
    test('prints warning for single file with dynamic usage', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.tsx',
          status: 'withDynamicImports',
        },
      ];

      printResults(results);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `${COLORS.yellow}Warning: Dynamic class usage detected in 1 files.${COLORS.reset}`
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `${COLORS.yellow}Cannot determine usability when using dynamic class access (e.g., styles[variable]).${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}components/Button.tsx${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('');
    });

    test('prints warning for multiple files with dynamic usage', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.tsx',
          status: 'withDynamicImports',
        },
        {
          file: 'components/Card.tsx',
          status: 'withDynamicImports',
        },
      ];

      printResults(results);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `${COLORS.yellow}Warning: Dynamic class usage detected in 2 files.${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}components/Button.tsx${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}components/Card.tsx${COLORS.reset}`
      );
    });
  });

  describe('when unimported files found', () => {
    test('prints information about single unimported file', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Unused.module.css',
          status: 'notImported',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 not imported CSS modules:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Unused.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('');
    });

    test('prints information about multiple unimported files', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Unused1.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Unused2.module.css',
          status: 'notImported',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 2 not imported CSS modules:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Unused1.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Unused2.module.css${COLORS.reset}`
      );
    });
  });

  describe('when unused classes found', () => {
    test('prints information about single unused class in one file', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: ['unused-button'],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 unused CSS classes in 1 files:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Button.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.unused-button${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('');
    });

    test('prints information about multiple unused classes in one file', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: ['unused-button', 'old-style', 'deprecated'],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 3 unused CSS classes in 1 files:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Button.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.unused-button${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.old-style${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.deprecated${COLORS.reset}`
      );
    });

    test('prints information about unused classes in multiple files', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: ['unused-button'],
          status: 'correct',
        },
        {
          file: 'components/Card.module.css',
          unusedClasses: ['old-card', 'deprecated-card'],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 3 unused CSS classes in 2 files:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Button.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.unused-button${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Card.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.old-card${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.deprecated-card${COLORS.reset}`
      );
    });

    test('ignores files with empty unused classes array', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: [],
          status: 'correct',
        },
        {
          file: 'components/Card.module.css',
          unusedClasses: ['unused-card'],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 unused CSS classes in 1 files:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        `${COLORS.cyan}components/Button.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Card.module.css${COLORS.reset}`
      );
    });
  });

  describe('mixed scenarios', () => {
    test('prints all types of issues simultaneously', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.tsx',
          status: 'withDynamicImports',
        },
        {
          file: 'components/Unused.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Card.module.css',
          unusedClasses: ['unused-card'],
          status: 'correct',
        },
      ];

      printResults(results);

      // Check dynamic usage output
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `${COLORS.yellow}Warning: Dynamic class usage detected in 1 files.${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}components/Button.tsx${COLORS.reset}`
      );

      // Check unimported files output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 not imported CSS modules:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Unused.module.css${COLORS.reset}`
      );

      // Check unused classes output
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 unused CSS classes in 1 files:${COLORS.reset}\n`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.cyan}components/Card.module.css${COLORS.reset}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.unused-card${COLORS.reset}`
      );

      // Should not print success message
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        `${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`
      );
    });

    test('prints warnings and unimported files without unused classes', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.tsx',
          status: 'withDynamicImports',
        },
        {
          file: 'components/Unused.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Card.module.css',
          unusedClasses: [],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 not imported CSS modules:${COLORS.reset}\n`
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        `${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`
      );
    });

    test('handles empty results array', () => {
      const results: UnusedClassResult[] = [];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`
      );
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('counting logic', () => {
    test('correctly counts total unused classes', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: ['btn1', 'btn2', 'btn3'],
          status: 'correct',
        },
        {
          file: 'components/Card.module.css',
          unusedClasses: ['card1', 'card2'],
          status: 'correct',
        },
        {
          file: 'components/Header.module.css',
          unusedClasses: ['header1'],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 6 unused CSS classes in 3 files:${COLORS.reset}\n`
      );
    });

    test('correctly counts files with dynamic usage', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.tsx',
          status: 'withDynamicImports',
        },
        {
          file: 'components/Card.tsx',
          status: 'withDynamicImports',
        },
        {
          file: 'components/Header.tsx',
          status: 'withDynamicImports',
        },
      ];

      printResults(results);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `${COLORS.yellow}Warning: Dynamic class usage detected in 3 files.${COLORS.reset}`
      );
    });

    test('correctly counts unimported files', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Unused1.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Unused2.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Unused3.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Unused4.module.css',
          status: 'notImported',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 4 not imported CSS modules:${COLORS.reset}\n`
      );
    });
  });

  describe('output formatting', () => {
    test('adds empty lines after each block', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.tsx',
          status: 'withDynamicImports',
        },
        {
          file: 'components/Unused.module.css',
          status: 'notImported',
        },
        {
          file: 'components/Card.module.css',
          unusedClasses: ['unused-card'],
          status: 'correct',
        },
      ];

      printResults(results);

      // Check that empty lines are added after each block
      const emptyCalls = consoleLogSpy.mock.calls.filter(
        (call: any[]) => call[0] === ''
      );
      expect(emptyCalls).toHaveLength(3); // One after each block
    });

    test('uses correct colors for different message types', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Card.module.css',
          unusedClasses: ['unused-card'],
          status: 'correct',
        },
      ];

      printResults(results);

      // Check red color for errors
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(COLORS.red)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(COLORS.reset)
      );

      // Check cyan color for file names
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(COLORS.cyan)
      );

      // Check yellow color for classes
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(COLORS.yellow)
      );
    });

    test('adds dot before class name', () => {
      const results: UnusedClassResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: ['button-class'],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `  ${COLORS.yellow}.button-class${COLORS.reset}`
      );
    });
  });
});
