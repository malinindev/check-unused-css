import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('--no-dynamic flag', () => {
  test('exits with code 1 when dynamic usage detected and --no-dynamic flag is used', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic/WithDynamic',
      undefined,
      true
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error: Dynamic class usage detected/);
    expect(result.stderr).toMatch(
      /Cannot determine usability when using dynamic class access/
    );
    expect(result.stdout).toMatch(/WithDynamic\.module\.css/);
  });

  test('exits with code 0 when dynamic usage detected but --no-dynamic flag is not used', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic/WithDynamic',
      undefined,
      false
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
    expect(result.stdout).toMatch(/WithDynamic\.module\.css/);
  });

  test('exits with code 0 when no dynamic usage and --no-dynamic flag is used', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic/WithoutDynamic',
      undefined,
      true
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
  });

  test('exits with code 1 when unused classes found regardless of --no-dynamic flag', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic/WithUnusedClasses',
      undefined,
      true
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Found .* unused CSS classes/);
    expect(result.stdout).toMatch(/unusedClass/);
    expect(result.stdout).toMatch(/anotherUnusedClass/);
  });

  test('exits with code 1 when dynamic usage detected with --no-dynamic (unused classes not reported due to dynamic usage)', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic/WithDynamicAndUnused',
      undefined,
      true
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error: Dynamic class usage detected/);
    expect(result.stdout).toMatch(/No unused CSS classes found/); // Because dynamic usage prevents detection
  });

  test('shows warnings for dynamic usage without --no-dynamic (exits with code 0)', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic/WithDynamicAndUnused',
      undefined,
      false
    );

    expect(result.exitCode).toBe(0); // No failure because --no-dynamic is not set and unused classes not detected due to dynamic usage
    expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
  });

  test('combines --no-dynamic with exclude patterns', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic',
      ['**/WithDynamic/**', '**/WithDynamicAndUnused/**'],
      true
    );

    // Should fail because WithUnusedClasses has unused classes
    expect(result.exitCode).toBe(1); // Still fails due to WithUnusedClasses
    expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
    expect(result.stderr).toMatch(/Found .* unused CSS classes/);
  });

  test('excludes unused classes but still fails on dynamic usage with --no-dynamic', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/noDynamic',
      ['**/WithUnusedClasses/**', '**/WithDynamicAndUnused/**'],
      true
    );

    // Should fail only due to WithDynamic
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error: Dynamic class usage detected/);
    expect(result.stdout).not.toMatch(/Found .* unused CSS classes/);
  });
});
