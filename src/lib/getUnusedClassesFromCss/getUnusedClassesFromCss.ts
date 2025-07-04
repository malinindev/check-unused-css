import type { UnusedClassResult } from '../../types.js';
import { extractCssClasses } from './utils/extractCssClasses/index.js';
import { findFilesImportingCssModule } from './utils/findFilesImportingCssModule.js';
import { findUnusedClasses } from './utils/findUnusedClasses/index.js';
import { getContentOfFiles } from '../../utils/getContentOfFiles.js';

type GetUnusedClassesFromCss = (params: {
  cssFile: string;
  srcDir: string;
}) => Promise<UnusedClassResult | null>;

export const getUnusedClassesFromCss: GetUnusedClassesFromCss = async ({
  cssFile,
  srcDir,
}) => {
  const cssContent = getContentOfFiles({ files: [cssFile], srcDir });
  const cssClasses = extractCssClasses(cssContent);

  if (cssClasses.length === 0) {
    return null;
  }

  const importingFilesData = await findFilesImportingCssModule(cssFile, srcDir);

  if (importingFilesData.length === 0) {
    return {
      file: cssFile,
      status: 'notImported',
    };
  }

  const importingFiles = importingFilesData.map((data) => data.file);
  const relevantTsContent = getContentOfFiles({
    files: importingFiles,
    srcDir,
  });

  const importNames = [
    ...new Set(importingFilesData.map((data) => data.importName)),
  ];

  const { unusedClasses, hasDynamicUsage } = findUnusedClasses({
    cssClasses,
    importNames,
    tsContent: relevantTsContent,
  });

  if (hasDynamicUsage) {
    return {
      file: cssFile,
      status: 'withDynamicImports',
    };
  }

  if (unusedClasses.length === 0) {
    return null;
  }

  return {
    file: cssFile,
    unusedClasses,
    status: 'correct',
  };
};
