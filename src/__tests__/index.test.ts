import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';

const runCheckUnusedCss = (
  targetPath?: string
): { stdout: string; exitCode: number } => {
  const args = targetPath ? ` ${targetPath}` : '';

  try {
    const stdout = execSync(`node dist/index.js${args}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { stdout, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      exitCode: error.status || 1,
    };
  }
};

describe('check-unused-css main function', () => {
  test('should show initial message', () => {
    const result = runCheckUnusedCss('nonexistent');

    assert.match(
      result.stdout,
      /Checking for unused CSS classes/,
      'Should show initial message'
    );
  });

  test('should exit with code 0 when no unused classes found', () => {
    const result = runCheckUnusedCss('src/__tests__/fixtures/clean');

    assert.strictEqual(
      result.exitCode,
      0,
      'Should exit with code 0 when no unused classes found'
    );
    assert.match(
      result.stdout,
      /Checking for unused CSS classes/,
      'Should show initial message'
    );
  });

  test('should find unused CSS classes in fixtures directory', () => {
    const result = runCheckUnusedCss('src/__tests__/fixtures/error');

    assert.strictEqual(
      result.exitCode,
      1,
      'Should exit with code 1 when unused classes found'
    );

    // Check Button.module.css unused classes
    assert.match(
      result.stdout,
      /Button\.module\.css/,
      'Should mention Button.module.css file'
    );
    assert.match(
      result.stdout,
      /primary/,
      'Should find primary class (dynamic access not recognized)'
    );
    assert.match(
      result.stdout,
      /secondary/,
      'Should find secondary class (dynamic access not recognized)'
    );
    assert.match(result.stdout, /unused-class/, 'Should find unused-class');
    assert.match(
      result.stdout,
      /another-unused/,
      'Should find another-unused class'
    );

    // Check Card.module.css unused classes
    assert.match(
      result.stdout,
      /Card\.module\.css/,
      'Should mention Card.module.css file'
    );
    assert.match(result.stdout, /footer/, 'Should find unused footer class');
    assert.match(
      result.stdout,
      /completely-unused/,
      'Should find completely-unused class'
    );

    // Check Unused.module.css (all classes are unused)
    assert.match(
      result.stdout,
      /Unused\.module\.css/,
      'Should mention Unused.module.css file'
    );
    assert.match(
      result.stdout,
      /completely-unused-file/,
      'Should find completely-unused-file class'
    );
    assert.match(
      result.stdout,
      /another-unused-class/,
      'Should find another-unused-class'
    );
    assert.match(
      result.stdout,
      /third-unused/,
      'Should find third-unused class'
    );
  });
});
