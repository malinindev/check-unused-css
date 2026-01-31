import { afterEach, describe, expect, test } from 'bun:test';
import path from 'node:path';
import {
  clearTsConfigCache,
  resolvePathAlias,
} from './resolveTsConfigPaths.js';

describe('resolvePathAlias', () => {
  afterEach(() => {
    clearTsConfigCache();
  });

  test('resolves @/* alias pattern', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportAt'
    );
    const result = resolvePathAlias(
      '@/AliasImportAt.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toBe(path.resolve(projectRoot, 'AliasImportAt.module.css'));
  });

  test('resolves ~/* alias pattern', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportTilde'
    );
    const result = resolvePathAlias(
      '~/AliasImportTilde.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toBe(
      path.resolve(projectRoot, 'AliasImportTilde.module.css')
    );
  });

  test('resolves nested @components/* alias', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasNested'
    );
    const result = resolvePathAlias(
      '@components/Button.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toBe(
      path.resolve(projectRoot, 'components/Button.module.css')
    );
  });

  test('returns null when no tsconfig found', () => {
    const projectRoot = path.resolve(__dirname, '../__tests__/noError/Plain');
    const result = resolvePathAlias(
      '@/nonexistent.css',
      projectRoot,
      projectRoot
    );

    expect(result).toBeNull();
  });

  test('returns null when import path does not match any alias', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportAt'
    );
    const result = resolvePathAlias(
      '~/some-other-path.css',
      projectRoot,
      projectRoot
    );

    expect(result).toBeNull();
  });

  test('returns null for relative paths', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportAt'
    );
    const result = resolvePathAlias(
      './relative-path.css',
      projectRoot,
      projectRoot
    );

    expect(result).toBeNull();
  });
});
