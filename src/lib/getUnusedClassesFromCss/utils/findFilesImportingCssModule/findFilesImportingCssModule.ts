import path from 'node:path';
import type {
  CssImportIndex,
  CssModuleImporter,
} from './buildCssImportIndex.js';

/**
 * Source files that import `cssFile`, looked up in an index built once per
 * run by `buildCssImportIndex`.
 */
export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string,
  cssImportIndex: CssImportIndex
): Promise<CssModuleImporter[]> => {
  const normalizedCssPath = path.normalize(path.join(srcDir, cssFile));

  return [...(cssImportIndex.get(normalizedCssPath) ?? [])];
};
