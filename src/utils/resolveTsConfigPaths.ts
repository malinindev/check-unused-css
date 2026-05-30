import fs from 'node:fs';
import path from 'node:path';
import {
  createPathsMatcher,
  getTsconfig,
  type PathsMatcher,
  parseTsconfig,
  type TsConfigResult,
} from 'get-tsconfig';

let cachedMatchers: PathsMatcher[] | null = null;
let cachedProjectRoot: string | null = null;

// Warn instead of silently dropping aliases when a tsconfig exists but is
// broken: dropping them would make alias-imported modules look un-imported,
// which auto-fix could then delete. A missing tsconfig stays silent.
const warnAliasFailure = (err: unknown): void => {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(
    `check-unused-css: failed to resolve tsconfig path aliases (${message}) — ` +
      'alias imports will not be matched, which may cause false "not imported" reports. ' +
      'Check your tsconfig "paths"/"references".'
  );
};

/**
 * Build a `paths` matcher from a project-reference target. A reference may point
 * at a directory or directly at a config file, so the directory form is
 * expanded to its `tsconfig.json` before parsing.
 */
const matcherFromReference = (refPath: string): PathsMatcher | null => {
  let configPath = refPath;

  if (!refPath.endsWith('.json') && fs.statSync(refPath).isDirectory()) {
    configPath = path.join(refPath, 'tsconfig.json');
  }

  const refResult: TsConfigResult = {
    path: configPath,
    config: parseTsconfig(configPath),
  };

  return createPathsMatcher(refResult);
};

/**
 * Build the ordered list of `paths` matchers for the nearest tsconfig: the entry
 * config first, then one per project `reference` it declares. Delegating to
 * `get-tsconfig` gives us the full TypeScript semantics for free — `paths`
 * without `baseUrl`, `extends` origin tracking, and `${configDir}`.
 */
const loadMatchers = (
  projectRoot: string,
  searchFromDir?: string
): PathsMatcher[] => {
  const cacheKey = searchFromDir || projectRoot;

  if (cachedProjectRoot === cacheKey && cachedMatchers !== null) {
    return cachedMatchers;
  }

  const matchers: PathsMatcher[] = [];
  let result: TsConfigResult | null = null;

  try {
    result = getTsconfig(cacheKey);
  } catch (err) {
    warnAliasFailure(err);
  }

  if (result?.config) {
    // Build the entry matcher and each referenced matcher in isolation, so one
    // broken config (e.g. an invalid `paths` pattern or an unresolvable
    // reference) never drops the aliases of the others.
    const sources: Array<() => PathsMatcher | null> = [
      () => createPathsMatcher(result as TsConfigResult),
    ];

    if (result.config.references) {
      const tsconfigDir = path.dirname(result.path);

      for (const ref of result.config.references) {
        if (!ref.path) continue;
        const refPath = path.resolve(tsconfigDir, ref.path);
        sources.push(() => matcherFromReference(refPath));
      }
    }

    for (const buildMatcher of sources) {
      try {
        const matcher = buildMatcher();
        if (matcher) matchers.push(matcher);
      } catch (err) {
        warnAliasFailure(err);
      }
    }
  }

  cachedMatchers = matchers;
  cachedProjectRoot = cacheKey;

  return matchers;
};

/**
 * Resolve an import specifier through the tsconfig `paths` aliases. An alias can
 * map to several targets, so all candidates from the first matching config are
 * returned (callers check each). Empty array when nothing matches.
 */
export const resolvePathAliases = (
  importPath: string,
  projectRoot: string,
  searchFromDir?: string
): string[] => {
  for (const matcher of loadMatchers(projectRoot, searchFromDir)) {
    const resolved = matcher(importPath);
    if (resolved.length > 0) return resolved;
  }

  return [];
};

export const clearTsConfigCache = (): void => {
  cachedMatchers = null;
  cachedProjectRoot = null;
};
