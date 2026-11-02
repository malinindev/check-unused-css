import path from 'node:path';
import { resolvePathAliases } from '../../../../../utils/resolveTsConfigPaths.js';

type ResolveOptions = {
  importPath: string;
  sourceDir: string;
  projectRoot: string;
  srcDir: string;
  isSrcDirProjectRoot: boolean;
};

/**
 * Every normalized path an import specifier may point to, in the order they
 * are tried. A CSS module is imported by the specifier when its path is one of
 * them.
 */
export const resolveImportCandidates = (options: ResolveOptions): string[] => {
  const { importPath, sourceDir, projectRoot, srcDir, isSrcDirProjectRoot } =
    options;

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return [path.normalize(path.resolve(sourceDir, importPath))];
  }

  const candidates = resolvePathAliases(importPath, projectRoot, srcDir).map(
    (resolved) => path.normalize(resolved)
  );

  candidates.push(path.normalize(path.resolve(srcDir, importPath)));

  if (isSrcDirProjectRoot) {
    return candidates;
  }

  candidates.push(
    path.normalize(path.resolve(projectRoot, importPath)),
    path.normalize(path.resolve(projectRoot, 'src', importPath))
  );

  return candidates;
};
