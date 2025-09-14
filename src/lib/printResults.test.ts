import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  spyOn,
  test,
} from 'bun:test';
import { COLORS } from '../consts.js';
import type { CssAnalysisResult } from '../types.js';
import { printResults } from './printResults.js';

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
      const results: CssAnalysisResult[] = [
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
      const results: CssAnalysisResult[] = [
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

  describe('when unused classes found', () => {
    test('prints information about unused classes with location', () => {
      const results: CssAnalysisResult[] = [
        {
          file: 'components/Button.module.css',
          unusedClasses: [{ className: 'unused', line: 5, column: 1 }],
          status: 'correct',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 classes defined in CSS but unused in TypeScript:${COLORS.reset}\n`
      );
    });
  });

  describe('when non-existent classes found', () => {
    test('prints information about non-existent classes with location', () => {
      const results: CssAnalysisResult[] = [
        {
          file: 'components/Button.module.css',
          nonExistentClasses: [
            { className: 'missing', file: 'Button.tsx', line: 5, column: 28 },
          ],
          status: 'nonExistentClasses',
        },
      ];

      printResults(results);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 classes used in TypeScript but non-existent in CSS:${COLORS.reset}\n`
      );
    });
  });

  describe('when dynamic usage detected', () => {
    test('prints warning for dynamic usage', () => {
      const results: CssAnalysisResult[] = [
        {
          file: 'components/Button.module.css',
          status: 'withDynamicImports',
        },
      ];

      printResults(results);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `${COLORS.yellow}Warning: Dynamic class usage detected in 1 files.${COLORS.reset}`
      );
    });
  });

  describe('when unimported files found', () => {
    test('prints information about unimported files', () => {
      const results: CssAnalysisResult[] = [
        {
          file: 'components/Button.module.css',
          status: 'notImported',
        },
      ];

      printResults(results);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `${COLORS.red}Found 1 not imported CSS modules:${COLORS.reset}\n`
      );
    });
  });
});
