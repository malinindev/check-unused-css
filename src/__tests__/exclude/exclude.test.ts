import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('Exclude patterns functionality', () => {
  test('runs without exclude patterns and finds all unused classes', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/unused CSS classes/);

    // Should find unused classes in both ToExclude and ToInclude
    expect(result.stdout).toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClass/);
    expect(result.stdout).toMatch(/\.anotherUnusedClass/);

    expect(result.stdout).toMatch(/ToInclude\/IncludeComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClassInInclude/);
    expect(result.stdout).toMatch(/\.anotherUnusedClassInInclude/);
  });

  test('excludes ToExclude directory when pattern is provided', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      '**/ToExclude/**',
    ]);

    expect(result.exitCode).toBe(1);

    // Should NOT find ToExclude files
    expect(result.stdout).not.toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).not.toMatch(/\.unusedClass$/m);
    expect(result.stdout).not.toMatch(/\.anotherUnusedClass$/m);

    // Should still find ToInclude files
    expect(result.stdout).toMatch(/ToInclude\/IncludeComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClassInInclude/);
    expect(result.stdout).toMatch(/\.anotherUnusedClassInInclude/);
  });

  test('excludes ToInclude directory when pattern is provided', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      '**/ToInclude/**',
    ]);

    expect(result.exitCode).toBe(1);

    // Should find ToExclude files
    expect(result.stdout).toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClass/);
    expect(result.stdout).toMatch(/\.anotherUnusedClass/);

    // Should NOT find ToInclude files
    expect(result.stdout).not.toMatch(
      /ToInclude\/IncludeComponent\.module\.css/
    );
    expect(result.stdout).not.toMatch(/\.unusedClassInInclude/);
    expect(result.stdout).not.toMatch(/\.anotherUnusedClassInInclude/);
  });

  test('excludes both directories with multiple patterns', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      '**/ToExclude/**',
      '**/ToInclude/**',
    ]);

    // Should exit with 0 since no CSS files to check
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/✓ No unused CSS classes found!/);
  });

  test('excludes specific file patterns', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      '**/TestComponent.module.css',
    ]);

    expect(result.exitCode).toBe(1);

    // Should NOT find TestComponent
    expect(result.stdout).not.toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).not.toMatch(/\.unusedClass$/m);
    expect(result.stdout).not.toMatch(/\.anotherUnusedClass$/m);

    // Should still find IncludeComponent
    expect(result.stdout).toMatch(/ToInclude\/IncludeComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClassInInclude/);
  });

  test('handles non-matching exclude patterns gracefully', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      '**/NonExistentPattern/**',
    ]);

    expect(result.exitCode).toBe(1);

    // Should find all files since pattern doesn't match anything
    expect(result.stdout).toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).toMatch(/ToInclude\/IncludeComponent\.module\.css/);
  });

  test('excludes using absolute paths from project root', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      'src/__tests__/exclude/ToExclude/**',
    ]);

    expect(result.exitCode).toBe(1);

    // Should NOT find ToExclude files (excluded by absolute path)
    expect(result.stdout).not.toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).not.toMatch(/\.unusedClass$/m);
    expect(result.stdout).not.toMatch(/\.anotherUnusedClass$/m);

    // Should still find ToInclude files
    expect(result.stdout).toMatch(/ToInclude\/IncludeComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClassInInclude/);
    expect(result.stdout).toMatch(/\.anotherUnusedClassInInclude/);
  });

  test('excludes using relative paths with ./ from project root', () => {
    const result = runCheckUnusedCss('src/__tests__/exclude', [
      './src/__tests__/exclude/ToInclude/**',
    ]);

    expect(result.exitCode).toBe(1);

    // Should find ToExclude files
    expect(result.stdout).toMatch(/ToExclude\/TestComponent\.module\.css/);
    expect(result.stdout).toMatch(/\.unusedClass/);
    expect(result.stdout).toMatch(/\.anotherUnusedClass/);

    // Should NOT find ToInclude files (excluded by relative path)
    expect(result.stdout).not.toMatch(
      /ToInclude\/IncludeComponent\.module\.css/
    );
    expect(result.stdout).not.toMatch(/\.unusedClassInInclude/);
    expect(result.stdout).not.toMatch(/\.anotherUnusedClassInInclude/);
  });
});
