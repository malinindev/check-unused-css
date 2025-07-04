import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
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

    expect(result).toEqual({ targetPath: undefined });
  });

  test('returns targetPath when one argument provided', () => {
    const testPath = '/path/to/target';
    process.argv = ['node', 'script.js', testPath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: testPath });
  });

  test('handles relative path argument', () => {
    const relativePath = './src/components';
    process.argv = ['node', 'script.js', relativePath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: relativePath });
  });

  test('handles absolute path argument', () => {
    const absolutePath = '/usr/local/src/project';
    process.argv = ['node', 'script.js', absolutePath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: absolutePath });
  });

  test('handles path with spaces', () => {
    const pathWithSpaces = '/path/with spaces/folder';
    process.argv = ['node', 'script.js', pathWithSpaces];

    const result = getArgs();

    expect(result).toEqual({ targetPath: pathWithSpaces });
  });

  test('handles Windows-style path', () => {
    const windowsPath = 'C:\\Users\\Documents\\project';
    process.argv = ['node', 'script.js', windowsPath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: windowsPath });
  });

  test('handles path with special characters', () => {
    const specialPath = './src/components-test_folder@123';
    process.argv = ['node', 'script.js', specialPath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: specialPath });
  });

  test('handles empty string argument', () => {
    process.argv = ['node', 'script.js', ''];

    const result = getArgs();

    expect(result).toEqual({ targetPath: '' });
  });

  test('throws error when multiple arguments provided', () => {
    process.argv = ['node', 'script.js', 'path1', 'path2'];

    expect(() => getArgs()).toThrow(
      'Too many arguments. Expected only one path argument.'
    );
  });

  test('throws error when three arguments provided', () => {
    process.argv = ['node', 'script.js', 'path1', 'path2', 'path3'];

    expect(() => getArgs()).toThrow(
      'Too many arguments. Expected only one path argument.'
    );
  });

  test('handles argument that looks like a flag', () => {
    const flagLikeArg = '--help';
    process.argv = ['node', 'script.js', flagLikeArg];

    const result = getArgs();

    expect(result).toEqual({ targetPath: flagLikeArg });
  });

  test('handles numeric argument', () => {
    const numericArg = '123';
    process.argv = ['node', 'script.js', numericArg];

    const result = getArgs();

    expect(result).toEqual({ targetPath: numericArg });
  });

  test('handles dot notation paths', () => {
    const dotPath = '../parent/folder';
    process.argv = ['node', 'script.js', dotPath];

    const result = getArgs();

    expect(result).toEqual({ targetPath: dotPath });
  });

  test('handles current directory notation', () => {
    const currentDir = '.';
    process.argv = ['node', 'script.js', currentDir];

    const result = getArgs();

    expect(result).toEqual({ targetPath: currentDir });
  });

  test('handles parent directory notation', () => {
    const parentDir = '..';
    process.argv = ['node', 'script.js', parentDir];

    const result = getArgs();

    expect(result).toEqual({ targetPath: parentDir });
  });
});
