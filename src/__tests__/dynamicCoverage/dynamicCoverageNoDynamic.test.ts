import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

const runNoDynamic = (folder: string) =>
  runCheckUnusedCss(`src/__tests__/dynamicCoverage/${folder}`, undefined, true);

describe('dynamic coverage — --no-dynamic matrix', () => {
  test('TemplatePattern: no dynamic error, but unused -> exit 1', () => {
    const result = runNoDynamic('TemplatePattern');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toMatch(/Error: Dynamic class usage detected/);
    expect(result.stderr).toMatch(/Found .* classes defined in CSS but unused/);
    expect(result.stdout).toMatch(/ - \.unrelated\b/);
  });

  test('TernaryLiterals: no dynamic error, leftover -> exit 1', () => {
    const result = runNoDynamic('TernaryLiterals');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toMatch(/Error: Dynamic class usage detected/);
    expect(result.stdout).toMatch(/ - \.c\b/);
  });

  test('AllCovered: pattern+literal cover all, no error, exit 0', () => {
    const result = runNoDynamic('AllCovered');

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toMatch(/Error: Dynamic class usage detected/);
    expect(result.stdout).toMatch(/No unused CSS classes found/);
  });

  test('BareVariable: dynamic error, exit 1 (guard)', () => {
    const result = runNoDynamic('BareVariable');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error: Dynamic class usage detected/);
    expect(result.stdout).toMatch(
      /BareVariable\.tsx:\d+:\d+ - \.styles\[variant\]/
    );
  });

  test('Concat: dynamic error, exit 1 (guard)', () => {
    const result = runNoDynamic('Concat');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error: Dynamic class usage detected/);
  });

  test('NoConstTemplate: dynamic error, exit 1 (guard)', () => {
    const result = runNoDynamic('NoConstTemplate');

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Error: Dynamic class usage detected/);
  });
});
