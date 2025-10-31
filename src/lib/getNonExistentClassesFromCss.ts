import type {
  NonExistentClassResult,
  NonExistentClassUsage,
} from '../types.js';
import { getContentOfFiles } from '../utils/getContentOfFiles.js';
import { parseIgnoreCommentsFromTs } from '../utils/parseIgnoreComments.js';
import { extractCssClasses } from './getUnusedClassesFromCss/utils/extractCssClasses/index.js';
import { extractUsedClassesWithLocations } from './getUnusedClassesFromCss/utils/extractUsedClasses.js';
import { findFilesImportingCssModule } from './getUnusedClassesFromCss/utils/findFilesImportingCssModule.js';
import { extractDynamicClassUsages } from './getUnusedClassesFromCss/utils/findUnusedClasses/utils/extractDynamicClassUsages.js';

type GetNonExistentClassesFromCssParams = {
  cssFile: string;
  srcDir: string;
};

export const getNonExistentClassesFromCss = async ({
  cssFile,
  srcDir,
}: GetNonExistentClassesFromCssParams): Promise<NonExistentClassResult | null> => {
  const importingFilesData = await findFilesImportingCssModule(cssFile, srcDir);

  // If no files import this CSS module, we can't have non-existent classes
  if (importingFilesData.length === 0) {
    return null;
  }

  const cssContent = getContentOfFiles({ files: [cssFile], srcDir });
  const cssClasses = extractCssClasses(cssContent);

  const nonExistentClasses: NonExistentClassUsage[] = [];

  // Process each importing file separately to get precise location info
  for (const importingFileData of importingFilesData) {
    const tsContent = getContentOfFiles({
      files: [importingFileData.file],
      srcDir,
    });

    const { isFileIgnored } = parseIgnoreCommentsFromTs(tsContent);
    if (isFileIgnored) {
      continue;
    }

    // Skip analysis if dynamic usage is detected
    if (
      extractDynamicClassUsages(tsContent, [importingFileData.importName], '')
        .length > 0
    ) {
      continue;
    }

    const usedClassesWithLocations = extractUsedClassesWithLocations({
      tsContent,
      importNames: [importingFileData.importName],
    });

    // Find classes that are used in code but don't exist in CSS
    for (const usedClass of usedClassesWithLocations) {
      if (!cssClasses.includes(usedClass.className)) {
        nonExistentClasses.push({
          className: usedClass.className,
          file: importingFileData.file,
          line: usedClass.line,
          column: usedClass.column,
        });
      }
    }
  }

  if (nonExistentClasses.length === 0) {
    return null;
  }

  return {
    file: cssFile,
    nonExistentClasses,
    status: 'nonExistentClasses',
  };
};
