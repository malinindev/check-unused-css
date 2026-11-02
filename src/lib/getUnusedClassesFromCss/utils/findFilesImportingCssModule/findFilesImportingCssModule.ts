import path from 'node:path';
import {
  buildCssImportIndex,
  type CssImportIndex,
  type CssModuleImporter,
} from './buildCssImportIndex.js';

/**
 * Source files that import `cssFile`. Pass an index built once per run when
 * looking up many modules; without one, the whole source tree is scanned.
 */
export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string,
  cssImportIndex?: CssImportIndex
): Promise<CssModuleImporter[]> => {
  const index = cssImportIndex ?? (await buildCssImportIndex(srcDir));
  const normalizedCssPath = path.normalize(path.join(srcDir, cssFile));

  return [...(index.get(normalizedCssPath) ?? [])];
};
