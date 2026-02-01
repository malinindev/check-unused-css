import type {
  DynamicClassUsage,
  UnusedClassResult,
  UnusedClassUsage,
} from '../../types.js';
import { getContentOfFiles } from '../../utils/getContentOfFiles.js';
import { parseIgnoreComments } from '../../utils/parseIgnoreComments.js';
import { extractCssClassesWithLocations } from './utils/extractCssClasses/index.js';
import { extractUsedClasses } from './utils/extractUsedClasses.js';
import { findFilesImportingCssModule } from './utils/findFilesImportingCssModule/index.js';
import { extractDynamicClassUsages } from './utils/findUnusedClasses/utils/extractDynamicClassUsages.js';

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

  const usedClasses = new Set<string>();
  let hasDynamicUsage = false;
  const dynamicUsages: DynamicClassUsage[] = [];

  for (const importingFileData of importingFilesData) {
    const tsContent = getContentOfFiles({
      files: [importingFileData.file],
      srcDir,
    });

    const { isFileIgnored } = parseIgnoreComments(tsContent);
    if (isFileIgnored) {
      // If file is ignored, treat all CSS classes as used from this file
      // This way ignored files don't cause false positives for unused classes
      for (const className of cssClasses) {
        usedClasses.add(className);
      }
      continue;
    }

    const fileDynamicUsages = extractDynamicClassUsages(
      tsContent,
      [importingFileData.importName],
      importingFileData.file
    );

    if (fileDynamicUsages.length > 0) {
      hasDynamicUsage = true;
      dynamicUsages.push(...fileDynamicUsages);
      continue;
    }

    const fileUsedClasses = extractUsedClasses({
      tsContent,
      importNames: [importingFileData.importName],
    });

    for (const className of fileUsedClasses) {
      usedClasses.add(className);
    }
  }

  if (hasDynamicUsage) {
    return {
      file: cssFile,
      status: 'withDynamicImports',
      dynamicUsages,
    };
  }

  const unusedClasses: string[] = [];
  for (const className of cssClasses) {
    if (!usedClasses.has(className)) {
      unusedClasses.push(className);
    }
  }

  if (unusedClasses.length === 0) {
    return null;
  }

  const locationMap = new Map(
    cssClassesWithLocations.map((info) => [info.className, info])
  );

  const unusedClassesWithLocations: UnusedClassUsage[] = unusedClasses.map(
    (className) => {
      const locationInfo = locationMap.get(className);
      if (!locationInfo) {
        console.warn(
          `Warning: Location information not found for unused class "${className}" in ${cssFile}. Using default location.`
        );
        return {
          className,
          line: -1,
          column: -1,
        };
      }

      return {
        className,
        line: locationInfo.line,
        column: locationInfo.column,
      };
    }
  );

  return {
    file: cssFile,
    unusedClasses: unusedClassesWithLocations,
    status: 'correct',
  };
};
