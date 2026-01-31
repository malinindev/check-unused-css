import { getTsconfig } from 'get-tsconfig';
import path from 'node:path';

type TsConfigCache = {
  baseUrl?: string;
  paths?: Record<string, string[]>;
};

let cachedTsConfig: TsConfigCache | null = null;
let cachedProjectRoot: string | null = null;

const loadTsConfig = (
  projectRoot: string,
  searchFromDir?: string
): TsConfigCache | null => {
  const cacheKey = searchFromDir || projectRoot;

  if (cachedProjectRoot === cacheKey && cachedTsConfig !== null) {
    return cachedTsConfig;
  }

  try {
    const result = getTsconfig(searchFromDir || projectRoot);

    if (!result?.config.compilerOptions) {
      cachedTsConfig = {};
      cachedProjectRoot = cacheKey;
      return cachedTsConfig;
    }

    const { baseUrl, paths } = result.config.compilerOptions;

    cachedTsConfig = {
      baseUrl: baseUrl
        ? path.resolve(path.dirname(result.path), baseUrl)
        : undefined,
      paths: paths || undefined,
    };
    cachedProjectRoot = cacheKey;

    return cachedTsConfig;
  } catch {
    cachedTsConfig = {};
    cachedProjectRoot = cacheKey;
    return cachedTsConfig;
  }
};

export const resolvePathAlias = (
  importPath: string,
  projectRoot: string,
  searchFromDir?: string
): string | null => {
  const config = loadTsConfig(projectRoot, searchFromDir);

  if (!config?.paths || !config?.baseUrl) {
    return null;
  }

  for (const [pattern, mappings] of Object.entries(config.paths)) {
    const mapping = mappings[0];
    if (!mapping) continue;

    const patternParts = pattern.split('*');

    if (patternParts.length === 1) {
      if (importPath !== pattern) continue;
      return path.resolve(config.baseUrl, mapping);
    }

    const prefix = patternParts[0];
    const suffix = patternParts[1] || '';

    const hasValidPrefix =
      prefix !== undefined && importPath.startsWith(prefix);
    const hasValidSuffix = importPath.endsWith(suffix);

    if (!hasValidPrefix || !hasValidSuffix) continue;

    const wildcardMatch = importPath.slice(
      prefix.length,
      importPath.length - suffix.length
    );

    const resolvedMapping = mapping.replace('*', wildcardMatch);
    return path.resolve(config.baseUrl, resolvedMapping);
  }

  return null;
};

export const clearTsConfigCache = (): void => {
  cachedTsConfig = null;
  cachedProjectRoot = null;
};
