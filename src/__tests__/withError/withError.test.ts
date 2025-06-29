import { test, describe, expect } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('Component with errors', () => {
  test.each([
    ['Plain', 'css'],
    ['PlainScss', 'scss'],
    ['PlainSass', 'sass'],
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
});
