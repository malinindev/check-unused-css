import path from 'node:path';
import { resolvePathAlias } from '../../../../../utils/resolveTsConfigPaths.js';

type ResolveOptions = {
  importPath: string;
  sourceDir: string;
  normalizedCssPath: string;
  projectRoot: string;
  srcDir: string;
  isSrcDirProjectRoot: boolean;
};

export const resolveImportPath = (options: ResolveOptions): boolean => {
  const {
    importPath,
    sourceDir,
    normalizedCssPath,
    projectRoot,
    srcDir,
    isSrcDirProjectRoot,
  } = options;

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const resolvedImportPath = path.resolve(sourceDir, importPath);
    return path.normalize(resolvedImportPath) === normalizedCssPath;
  }

  const aliasResolvedPath = resolvePathAlias(importPath, projectRoot, srcDir);
  if (
    aliasResolvedPath &&
    path.normalize(aliasResolvedPath) === normalizedCssPath
  ) {
    return true;
  }

  const srcDirPath = path.normalize(path.resolve(srcDir, importPath));
  if (srcDirPath === normalizedCssPath) {
    return true;
  }

  if (isSrcDirProjectRoot) {
    return false;
  }

  const projectRootPath = path.normalize(path.resolve(projectRoot, importPath));
  if (projectRootPath === normalizedCssPath) {
    return true;
  }

  const srcPrefixedPath = path.normalize(
    path.resolve(projectRoot, 'src', importPath)
  );
  return srcPrefixedPath === normalizedCssPath;
};
