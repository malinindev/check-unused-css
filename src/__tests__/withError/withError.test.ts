import { test, describe, expect } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('Component with errors', () => {
  test.each([
    ['Plain', 'css'],
    ['PlainScss', 'scss'],
    ['WithNotClosedQuote', 'css'],
    ['WithRegex', 'css'],
    ['WithComments', 'css'],
  ])('finds unused CSS classes in %s component', (componentName, extension) => {
    const result = runCheckUnusedCss(
      `src/__tests__/withError/${componentName}`
    );
    expect(result.exitCode).toBe(1);

    const fileRegexp = new RegExp(
      `^${componentName}\.module\.${extension}$`,
      'm'
    );
    expect(result.stdout).toMatch(fileRegexp);

    expect(result.stdout).toMatch(/^\s+\.unusedClass$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass2$/m);

    expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
  });

  test('shows error for not imported css modules', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/NotImportedModule'
    );

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(/^Found 1 not imported CSS modules:$/m);
    expect(result.stdout).toMatch(/^NotImported.module.css$/m);
  });

  test('shows error for unused class with global parents', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/GlobalClasses');

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(/^\s+\.unusedClass$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass2$/m);

    expect(result.stdout).not.toMatch(/^\s+\.usedClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.usedClass2$/m);
  });

  test('shows error for unused class in complex selectors', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/Complex');

    expect(result.exitCode).toBe(1);

    expect(result.stdout).toMatch(/^\s+\.unusedClass$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass2$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass3$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass4$/m);

    expect(result.stdout).toMatch(/^\s+\.unusedClassInternal$/m);

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

    expect(result.stdout).toMatch(/^\s+\.clearUnused$/m);

    expect(result.stdout).toMatch(/^\s+\.unusedClass$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass2$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass3$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass4$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass5$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass6$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass7$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass8$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass9$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass10$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass11$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass12$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass13$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass14$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass15$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass16$/m);
    expect(result.stdout).toMatch(/^\s+\.unusedClass17$/m);

    expect(result.stdout).toMatch(/^\s+\.constNameAsClass$/m);
    expect(result.stdout).toMatch(/^\s+\.varNameAsClass$/m);
    expect(result.stdout).toMatch(/^\s+\.letNameAsClass$/m);
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
