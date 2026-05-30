import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import path from 'node:path';
import {
  clearTsConfigCache,
  resolvePathAliases,
} from './resolveTsConfigPaths.js';

describe('resolvePathAliases', () => {
  afterEach(() => {
    clearTsConfigCache();
    mock.restore();
  });

  test('resolves @/* alias pattern', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportAt'
    );
    const result = resolvePathAliases(
      '@/AliasImportAt.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'AliasImportAt.module.css'),
    ]);
  });

  test('resolves ~/* alias pattern', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportTilde'
    );
    const result = resolvePathAliases(
      '~/AliasImportTilde.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'AliasImportTilde.module.css'),
    ]);
  });

  test('resolves nested @components/* alias', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasNested'
    );
    const result = resolvePathAliases(
      '@components/Button.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'components/Button.module.css'),
    ]);
  });

  test('returns empty array when no tsconfig found', () => {
    const projectRoot = path.resolve(__dirname, '../__tests__/noError/Plain');
    const result = resolvePathAliases(
      '@/nonexistent.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([]);
  });

  test('returns empty array when import path does not match any alias', () => {
    // No-baseUrl fixture on purpose: with `baseUrl`, a bare non-match resolves
    // against it (non-empty); without it, an unmatched alias yields nothing.
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasNoBaseUrl'
    );
    const result = resolvePathAliases(
      '~/some-other-path.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([]);
  });

  test('returns empty array for relative paths', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportAt'
    );
    const result = resolvePathAliases(
      './relative-path.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([]);
  });

  test('resolves aliases from referenced tsconfig (project references)', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasWithReferences'
    );
    const result = resolvePathAliases(
      '@/AliasWithReferences.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'AliasWithReferences.module.css'),
    ]);
  });

  test('resolves @/* alias without baseUrl (resolves relative to tsconfig dir)', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasNoBaseUrl'
    );
    const result = resolvePathAliases(
      '@/AliasNoBaseUrl.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'AliasNoBaseUrl.module.css'),
    ]);
  });

  test('resolves nested @components/* alias without baseUrl', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasNoBaseUrlNested'
    );
    const result = resolvePathAliases(
      '@components/Button.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'components/Button.module.css'),
    ]);
  });

  // Unit-only: `extractCssImports` requires a .css/.scss/.sass extension in the
  // specifier, so a bare `@styles` import is never extracted — don't add a .tsx
  // fixture for this, it can't be tested end-to-end.
  test('resolves exact (non-wildcard) alias without baseUrl', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasNoBaseUrlExact'
    );
    const result = resolvePathAliases('@styles', projectRoot, projectRoot);

    expect(result).toEqual([
      path.resolve(projectRoot, 'AliasNoBaseUrlExact.module.css'),
    ]);
  });

  test('resolves aliases from referenced tsconfig without baseUrl (project references)', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasReferencesNoBaseUrl'
    );
    const result = resolvePathAliases(
      '@/AliasReferencesNoBaseUrl.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'AliasReferencesNoBaseUrl.module.css'),
    ]);
  });

  test('returns all candidates when an alias maps to multiple targets', () => {
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasMultiTarget'
    );
    const result = resolvePathAliases(
      '@/MultiTarget.module.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([
      path.resolve(projectRoot, 'first/MultiTarget.module.css'),
      path.resolve(projectRoot, 'second/MultiTarget.module.css'),
    ]);
  });

  test('warns and returns empty array when tsconfig has an invalid paths pattern', () => {
    const noop = (): void => undefined;
    const warnSpy = spyOn(console, 'warn').mockImplementation(noop);
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasInvalidPattern'
    );

    const result = resolvePathAliases('@bad/a/b', projectRoot, projectRoot);

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(
      /check-unused-css: failed to resolve tsconfig path aliases/
    );
  });

  test('stays silent (no warning) when tsconfig has no paths/aliases', () => {
    const noop = (): void => undefined;
    const warnSpy = spyOn(console, 'warn').mockImplementation(noop);
    const projectRoot = path.resolve(__dirname, '../__tests__/noError/Plain');

    const result = resolvePathAliases(
      '@/anything.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('warns and returns empty array when a referenced config cannot be resolved', () => {
    const noop = (): void => undefined;
    const warnSpy = spyOn(console, 'warn').mockImplementation(noop);
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasBrokenReference'
    );

    const result = resolvePathAliases(
      '@/anything.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(
      /check-unused-css: failed to resolve tsconfig path aliases/
    );
  });

  test('resolves a non-matching bare import against baseUrl when baseUrl is set', () => {
    // With `baseUrl`, a non-relative import that matches no alias still resolves
    // against `baseUrl` (TypeScript behavior). Locked in here.
    const projectRoot = path.resolve(
      __dirname,
      '../__tests__/noError/AliasImportAt'
    );
    const result = resolvePathAliases(
      'some/bare-import.css',
      projectRoot,
      projectRoot
    );

    expect(result).toEqual([path.resolve(projectRoot, 'some/bare-import.css')]);
  });
});
