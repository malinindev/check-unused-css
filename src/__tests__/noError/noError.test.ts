import { describe, expect, test } from 'bun:test';
import { runCheckUnusedCss } from '../runCheckUnusedCss.js';

describe('Components without errors', () => {
  test('shows initial message', () => {
    const result = runCheckUnusedCss('nonexistent');

    expect(result.stdout).toMatch(/Checking for unused CSS classes/);
  });

  test.each([
    'Plain',
    'PlainScss',
    'PlainSass',
    'GlobalClasses',
    'Animations',
    'Complex',
    'Media',
    'Nested',
    'Pseudo',
    'ComposedClasses',
    'Svg',
    'WithApostropheInComment',
    'WithApostropheInText',
    'WithApostropheInText2',
    'WithNotClosedQuote',
    'WithRegex',
    'WithComments',
    'WithScssComments',
    'WithRegexAndComment',
    'AllClassesExist',
    'AbsoluteImport',
    '(Documentation)SpecialChars',
    '[Brackets]And.Dots',
    'MultipleStyles',
    'IgnoreFileCss',
    'IgnoreNextLineCss',
    'IgnoreFileTs',
    'IgnoreNextLineTs',
    'IgnoreMultiLineComment',
    'AliasImportAt',
    'AliasImportTilde',
    'AliasNested',
    'AliasWithReferences',
    'AliasNoBaseUrl',
    'AliasNoBaseUrlNested',
    'AliasReferencesNoBaseUrl',
    'AliasDirReferenceNoBaseUrl',
    'AliasMultiTarget',
    'ScssAmpersandConcat',
    'PlainJsx',
    'MixedTsxJsx',
  ])('exits with code 0 when no unused classes found for component %s', (folderName) => {
    const result = runCheckUnusedCss(`src/__tests__/noError/${folderName}`);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Checking for unused CSS classes/);
  });

  // NOTE: only expressions that truly cover all classes remain "dynamic" here.
  // `&&`, `||` and `??` cannot be reduced to a constant pattern, so they stay
  // covers-all. Ternaries of string literals and templates with a constant part
  // (incl. `DynamicWithMath`'s `` `usedClass${i + 1}` ``) now resolve to a
  // pattern/literal set and surface the genuinely-unused class — see the block
  // further down.
  test.each([
    'DynamicWithAnd',
    'DynamicWithNullish',
    'DynamicWithOr',
  ])('exits with code 0 when no unused classes found for component dynamic/%s', (folderName) => {
    const result = runCheckUnusedCss(
      `src/__tests__/noError/dynamic/${folderName}`
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Checking for unused CSS classes/);
  });

  test.each([
    'DynamicWithAnd',
    'DynamicWithNullish',
    'DynamicWithOr',
  ])('shows warning for dynamic used styles component dynamic/%s', (folderName) => {
    const result = runCheckUnusedCss(
      `src/__tests__/noError/dynamic/${folderName}`
    );

    expect(result.stderr).toMatch(/Warning: Dynamic class usage detected/);
    expect(result.stderr).toMatch(
      /Cannot determine usability when using dynamic class access/
    );
    expect(result.stdout).toMatch(
      new RegExp(`${folderName}\\.(?:tsx|jsx):\\d+:\\d+ - \\.styles\\[`)
    );
  });

  // Statically-resolvable dynamic access (ternary of literals / template with a
  // constant part) now surfaces the truly-unused class instead of hiding the
  // whole module. These previously sat in the "exit 0 + warning" lists above.
  // `DynamicWithMath` uses `` styles[`usedClass${index + 1}`] `` — the constant
  // `usedClass` makes it a pattern (`^usedClass.*$`) that covers `usedClass2`
  // but not `unusedClass`.
  test.each([
    'DynamicWithCondition',
    'DynamicJsx',
    'DynamicWithTemplates',
    'DynamicWithMath',
  ])('reports the genuinely unused class for statically-resolvable dynamic/%s', (folderName) => {
    const result = runCheckUnusedCss(
      `src/__tests__/noError/dynamic/${folderName}`
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Found .* classes defined in CSS but unused/);
    expect(result.stdout).toMatch(/ - \.unusedClass\b/);
    expect(result.stderr).not.toMatch(/Dynamic class usage detected/);
  });
});
