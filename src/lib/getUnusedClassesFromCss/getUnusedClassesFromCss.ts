import type { UnusedClassResult, UnusedClassUsage } from '../../types.js';
import { getContentOfFiles } from '../../utils/getContentOfFiles.js';
import { extractCssClassesWithLocations } from './utils/extractCssClasses/index.js';
import { findFilesImportingCssModule } from './utils/findFilesImportingCssModule.js';
import { findUnusedClasses } from './utils/findUnusedClasses/index.js';

type GetUnusedClassesFromCssParams = {
  cssFile: string;
  srcDir: string;
};

export const getUnusedClassesFromCss = async ({
  cssFile,
  srcDir,
}: GetUnusedClassesFromCssParams): Promise<UnusedClassResult | null> => {
  const cssContent = getContentOfFiles({ files: [cssFile], srcDir });
  const cssClassesWithLocations = extractCssClassesWithLocations(cssContent);
  const cssClasses = cssClassesWithLocations.map((info) => info.className);

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

  // Map unused class names to their location information
  const unusedClassesWithLocations: UnusedClassUsage[] = unusedClasses
    .map((className) => {
      const locationInfo = cssClassesWithLocations.find(
        (info) => info.className === className
      );
      if (!locationInfo) return null;
      return {
        className,
        line: locationInfo.line,
        column: locationInfo.column,
      };
    })
    .filter((value): value is UnusedClassUsage => value !== null);

  return {
    file: cssFile,
    unusedClasses: unusedClassesWithLocations,
    status: 'correct',
  };
};
