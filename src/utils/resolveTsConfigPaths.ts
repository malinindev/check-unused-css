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

  try {
    const result = getTsconfig(cacheKey);

    if (result?.config) {
      const entryMatcher = createPathsMatcher(result);
      if (entryMatcher) matchers.push(entryMatcher);

      if (result.config.references) {
        const tsconfigDir = path.dirname(result.path);

        for (const ref of result.config.references) {
          if (!ref.path) continue;

          const refMatcher = matcherFromReference(
            path.resolve(tsconfigDir, ref.path)
          );
          if (refMatcher) matchers.push(refMatcher);
        }
      }
    }
  } catch (err) {
    // The tsconfig exists but is broken (invalid `paths` pattern, unresolvable
    // `references`). Warn instead of silently dropping aliases: that would make
    // alias-imported modules look un-imported, which auto-fix could then delete.
    // A missing tsconfig returns null without throwing and stays silent.
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `check-unused-css: failed to resolve tsconfig path aliases (${message}) — ` +
        'alias imports will not be matched, which may cause false "not imported" reports. ' +
        'Check your tsconfig "paths"/"references".'
    );
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
