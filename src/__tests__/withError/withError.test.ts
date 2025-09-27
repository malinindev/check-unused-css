import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('Component with errors', () => {
  test.each([
    ['Plain', 'css'],
    ['PlainScss', 'scss'],
    ['WithNotClosedQuote', 'css'],
    ['WithRegex', 'css'],
    ['WithComments', 'css'],
    ['WithJSXComments', 'css'],
    ['NonExistentClasses', 'css'],
    ['NonExistentClassesScss', 'scss'],
    ['NestedCss', 'css'],
  ])('finds errors in %s component', (componentName, extension) => {
    const result = runCheckUnusedCss(
      `src/__tests__/withError/${componentName}`
    );
    expect(result.exitCode).toBe(1);

    // Check that some error is reported (could be unused or non-existent classes)
    if (
      componentName === 'NonExistentClasses' ||
      componentName === 'NonExistentClassesScss'
    ) {
      // For non-existent classes tests, check for non-existent class errors
      expect(result.stderr).toMatch(
        /Found .* classes used in TypeScript but non-existent in CSS/
      );
      // Check for .tsx file in output instead of .css/.scss
      const tsxFileRegexp = new RegExp(`${componentName}\\.tsx:\\d+:\\d+`, 'm');
      expect(result.stdout).toMatch(tsxFileRegexp);
      return; // Skip unused class checks for non-existent tests
    } else {
      // For unused classes, check CSS file output
      const fileRegexp = new RegExp(
        `${componentName}.module.${extension}:\\d+:\\d+`,
        'm'
      );
      expect(result.stdout).toMatch(fileRegexp);
      // For other tests, check for unused class errors
      expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass$/m);
      expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass2$/m);

      expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
      expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
    }
  });

  test('shows error for not imported css modules', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/NotImportedModule'
    );

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(/^Found 1 not imported CSS modules:$/m);
    expect(result.stdout).toMatch(/^\s\sNotImported.module.css$/m);
  });

  test('shows error for unused class with global parents', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/GlobalClasses');

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass2$/m);

    expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
  });

  test('shows error for unused class in complex selectors', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/Complex');

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass2$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass3$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass4$/m);

    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClassInternal$/m);

    expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
  });

  test('shows error for unused classes that written in text of the component, not in class', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/StringSimilarToUsage'
    );

    expect(result.exitCode).toBe(1);

    expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass3$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass4$/m);

    expect(result.stdout).toMatch(/:\d+:\d+ - \.clearUnused$/m);

    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass2$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass3$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass4$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass5$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass6$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass7$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass8$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass9$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass10$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass11$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass12$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass13$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass14$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass15$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass16$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass17$/m);

    expect(result.stdout).toMatch(/:\d+:\d+ - \.constNameAsClass$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.varNameAsClass$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.letNameAsClass$/m);
  });

  test('correctly handles pseudo-selectors with :not() and extracts classes from their arguments', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/NestedCss');

    expect(result.exitCode).toBe(1);

    // Should report unused classes
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.unusedClass2$/m);

    // Should report classes used only in CSS selectors but not in TypeScript
    expect(result.stdout).toMatch(/:\d+:\d+ - \.specialState$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.disabled$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.active$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.button$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.container$/m);
    expect(result.stdout).toMatch(/:\d+:\d+ - \.item$/m);

    // Should NOT report classes that are actually used in TypeScript
    expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass3$/m);

    // Should NOT show non-existent class errors (classes in :not() should be extracted correctly)
    expect(result.stderr).not.toMatch(
      /Found .* classes used in TypeScript but non-existent in CSS/
    );
  });

  test('shows error if not existed path', () => {
    const result = runCheckUnusedCss('src/NOT_EXISTED_PATH');

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(
      /^Error: Directory "src\/NOT_EXISTED_PATH" does not exist\.$/m
    );
  });

  test('shows error if passed path to file, not folder', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/Plain/Plain.tsx');

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(
      /^Error: "src\/__tests__\/withError\/Plain\/Plain\.tsx" is a file. Please provide a directory path\.$/m
    );
  });
});
