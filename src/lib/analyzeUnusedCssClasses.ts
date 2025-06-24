import type { UnusedClassResult } from '../types.js';
import { extractCssClasses } from './extractCssClasses.js';
import { findFilesImportingCssModule } from './findFilesImportingCssModule.js';
import { findUnusedClasses } from './findUnusedClasses.js';
import { getContentOfFiles } from '../utils/getContentOfFiles.js';

export const analyzeUnusedCssClasses = async (
  cssFile: string,
  srcDir: string
): Promise<UnusedClassResult | null> => {
  const cssContent = getContentOfFiles([cssFile], srcDir);

  const cssClasses = extractCssClasses(cssContent);

  if (cssClasses.length === 0) {
    return null;
  }

  const importingFilesData = await findFilesImportingCssModule(cssFile, srcDir);

  if (importingFilesData.length === 0) {
    return {
      file: cssFile,
      unusedClasses: cssClasses,
    };
  }

  const importingFiles = importingFilesData.map((data) => data.file);
  const relevantTsContent = getContentOfFiles(importingFiles, srcDir);

  const importNames = [
    ...new Set(importingFilesData.map((data) => data.importName)),
  ];

  const { unusedClasses, hasDynamicUsage } = findUnusedClasses(
    cssClasses,
    relevantTsContent,
    importNames
  );

  if (unusedClasses.length === 0 && !hasDynamicUsage) {
    return null;
  }

  return {
    file: cssFile,
    unusedClasses,
    hasDynamicUsage,
  };
};
