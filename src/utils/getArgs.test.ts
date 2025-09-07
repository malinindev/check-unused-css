import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getArgs } from './getArgs.js';

describe('getArgs', () => {
  let originalArgv: string[];

  beforeEach(() => {
    // Save original process.argv
    originalArgv = [...process.argv];
  });

  afterEach(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  test('returns empty object when no arguments provided', () => {
    process.argv = ['node', 'script.js'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: undefined,
    });
  });

  test('returns targetPath when one argument provided', () => {
    const testPath = '/path/to/target';
    process.argv = ['node', 'script.js', testPath];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: testPath,
      excludePatterns: undefined,
    });
  });

  test('handles relative path argument', () => {
    const relativePath = './src/components';
    process.argv = ['node', 'script.js', relativePath];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: relativePath,
      excludePatterns: undefined,
    });
  });

  test('handles absolute path argument', () => {
    const absolutePath = '/usr/local/src/project';
    process.argv = ['node', 'script.js', absolutePath];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: absolutePath,
      excludePatterns: undefined,
    });
  });

  test('handles path with spaces', () => {
    const pathWithSpaces = '/path/with spaces/folder';
    process.argv = ['node', 'script.js', pathWithSpaces];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: pathWithSpaces,
      excludePatterns: undefined,
    });
  });

  test('handles Windows-style path', () => {
    const windowsPath = 'C:\\Users\\Documents\\project';
    process.argv = ['node', 'script.js', windowsPath];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: windowsPath,
      excludePatterns: undefined,
    });
  });

  test('handles path with special characters', () => {
    const specialPath = './src/components-test_folder@123';
    process.argv = ['node', 'script.js', specialPath];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: specialPath,
      excludePatterns: undefined,
    });
  });

  test('handles empty string argument', () => {
    process.argv = ['node', 'script.js', ''];

    const result = getArgs();

    expect(result).toEqual({ targetPath: '', excludePatterns: undefined });
  });

  test('throws error when multiple path arguments provided', () => {
    process.argv = ['node', 'script.js', 'path1', 'path2'];

    expect(() => getArgs()).toThrow(
      'Multiple path arguments provided. Expected only one path argument.'
    );
  });

  test('throws error when three path arguments provided', () => {
    process.argv = ['node', 'script.js', 'path1', 'path2', 'path3'];

    expect(() => getArgs()).toThrow(
      'Multiple path arguments provided. Expected only one path argument.'
    );
  });

  test('throws error for unknown flags', () => {
    const flagLikeArg = '--help';
    process.argv = ['node', 'script.js', flagLikeArg];

    expect(() => getArgs()).toThrow('Unknown flag: --help');
  });

  test('handles numeric argument', () => {
    const numericArg = '123';
    process.argv = ['node', 'script.js', numericArg];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: numericArg,
      excludePatterns: undefined,
    });
  });

  test('handles dot notation paths', () => {
    const dotPath = '../parent/folder';
    process.argv = ['node', 'script.js', dotPath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: dotPath, excludePatterns: undefined });
  });

  test('handles current directory notation', () => {
    const currentDir = '.';
    process.argv = ['node', 'script.js', currentDir];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: currentDir,
      excludePatterns: undefined,
    });
  });

  test('handles parent directory notation', () => {
    const parentDir = '..';
    process.argv = ['node', 'script.js', parentDir];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: parentDir,
      excludePatterns: undefined,
    });
  });

  // New tests for exclude patterns
  test('handles single exclude pattern with --exclude flag', () => {
    process.argv = ['node', 'script.js', '--exclude', '**/test/**'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['**/test/**'],
    });
  });

  test('handles single exclude pattern with -e flag', () => {
    process.argv = ['node', 'script.js', '-e', '**/test/**'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['**/test/**'],
    });
  });

  test('handles exclude pattern with equals syntax --exclude=', () => {
    process.argv = ['node', 'script.js', '--exclude=**/test/**'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['**/test/**'],
    });
  });

  test('handles exclude pattern with equals syntax -e=', () => {
    process.argv = ['node', 'script.js', '-e=**/test/**'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['**/test/**'],
    });
  });

  test('handles multiple exclude patterns', () => {
    process.argv = [
      'node',
      'script.js',
      '--exclude',
      '**/test/**',
      '-e',
      '**/stories/**',
    ];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['**/test/**', '**/stories/**'],
    });
  });

  test('handles path and exclude patterns together', () => {
    process.argv = [
      'node',
      'script.js',
      'src/components',
      '--exclude',
      '**/test/**',
    ];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: 'src/components',
      excludePatterns: ['**/test/**'],
    });
  });

  test('handles exclude patterns and path in different order', () => {
    process.argv = [
      'node',
      'script.js',
      '--exclude',
      '**/test/**',
      'src/components',
    ];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: 'src/components',
      excludePatterns: ['**/test/**'],
    });
  });

  test('throws error when --exclude flag has no pattern', () => {
    process.argv = ['node', 'script.js', '--exclude'];

    expect(() => getArgs()).toThrow(
      '--exclude flag requires a pattern argument.'
    );
  });

  test('throws error when -e flag has no pattern', () => {
    process.argv = ['node', 'script.js', '-e'];

    expect(() => getArgs()).toThrow(
      '--exclude flag requires a pattern argument.'
    );
  });

  test('throws error when --exclude= has empty pattern', () => {
    process.argv = ['node', 'script.js', '--exclude='];

    expect(() => getArgs()).toThrow(
      '--exclude flag requires a pattern argument.'
    );
  });

  test('throws error when -e= has empty pattern', () => {
    process.argv = ['node', 'script.js', '-e='];

    expect(() => getArgs()).toThrow('-e flag requires a pattern argument.');
  });

  test('throws error when exclude flag is followed by another flag', () => {
    process.argv = ['node', 'script.js', '--exclude', '--other-flag'];

    expect(() => getArgs()).toThrow(
      '--exclude flag requires a pattern argument.'
    );
  });

  test('handles complex exclude patterns', () => {
    process.argv = [
      'node',
      'script.js',
      '--exclude',
      '**/*.test.{css,scss}',
      '-e',
      '**/node_modules/**',
    ];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['**/*.test.{css,scss}', '**/node_modules/**'],
    });
  });

  test('handles patterns with equals signs using --exclude=', () => {
    process.argv = ['node', 'script.js', '--exclude=pattern=with=equals'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['pattern=with=equals'],
    });
  });

  test('handles patterns with equals signs using -e=', () => {
    process.argv = ['node', 'script.js', '-e=another=pattern=with=equals'];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: ['another=pattern=with=equals'],
    });
  });

  test('handles multiple patterns with equals signs', () => {
    process.argv = [
      'node',
      'script.js',
      '--exclude=first=pattern=with=equals',
      '-e=second=pattern=with=equals',
    ];

    const result = getArgs();

    expect(result).toEqual({
      targetPath: undefined,
      excludePatterns: [
        'first=pattern=with=equals',
        'second=pattern=with=equals',
      ],
    });
  });
});
