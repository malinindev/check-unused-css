import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from './runCheckUnusedCss.js';

describe('Non-existent CSS classes detection', () => {
  test('detects non-existent CSS classes in regular CSS file', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/NonExistentClasses'
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(
      /Found .* classes used in TypeScript but non-existent in CSS/
    );
    expect(result.stdout).toMatch(
      /NonExistentClasses\.tsx:\d+:\d+ - \.nonExistentClass1/
    );
    expect(result.stdout).toMatch(
      /NonExistentClasses\.tsx:\d+:\d+ - \.nonExistentClass2/
    );
    expect(result.stdout).toMatch(
      /NonExistentClasses\.tsx:\d+:\d+ - \.nonExistentClass3/
    );

    // Existing classes should not be reported
    expect(result.stdout).not.toMatch(/^\s+\.existingClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.anotherExistingClass$/m);
  });

  test('detects non-existent CSS classes in SCSS file', () => {
    const result = runCheckUnusedCss(
      'src/__tests__/withError/NonExistentClassesScss'
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(
      /Found .* classes used in TypeScript but non-existent in CSS/
    );
    expect(result.stdout).toMatch(
      /NonExistentClassesScss\.tsx:\d+:\d+ - \.invalidClass/
    );
    expect(result.stdout).toMatch(
      /NonExistentClassesScss\.tsx:\d+:\d+ - \.anotherInvalidClass/
    );

    // Valid classes should not be reported
    expect(result.stdout).not.toMatch(/^\s+\.validClass$/m);
    expect(result.stdout).not.toMatch(/^\s+\.anotherValidClass$/m);
  });

  test('exits with code 0 when all referenced classes exist', () => {
    const result = runCheckUnusedCss('src/__tests__/noError/AllClassesExist');

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toMatch(/non-existent CSS classes/);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
  });

  test('reports both unused and non-existent classes in same run', () => {
    const result = runCheckUnusedCss('src/__tests__/withError/Plain');

    expect(result.exitCode).toBe(1);
    // Should report unused classes (existing functionality)
    expect(result.stderr).toMatch(
      /Found .* classes defined in CSS but unused in TypeScript/
    );
    expect(result.stdout).toMatch(
      /Plain\.module\.css:\d+:\d+ - \.unusedClass$/m
    );
    expect(result.stdout).toMatch(
      /Plain\.module\.css:\d+:\d+ - \.unusedClass2$/m
    );
  });

  test('skips non-existent class detection when dynamic usage is present', () => {
    const result = runCheckUnusedCss('src/__tests__/noDynamic/WithDynamic');

    // Should show dynamic usage warning, but not report non-existent classes
    expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
    expect(result.stderr).not.toMatch(/non-existent CSS classes/);
  });
});
