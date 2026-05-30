import type {
  DynamicClassUsage,
  UnusedClassResult,
  UnusedClassUsage,
} from '../../types.js';
import { getContentOfFiles } from '../../utils/getContentOfFiles.js';
import { parseIgnoreComments } from '../../utils/parseIgnoreComments.js';
import {
  applyCoverage,
  type ClassAccess,
  extractClassAccesses,
} from './utils/coverage/index.js';
import { extractCssClassesWithLocations } from './utils/extractCssClasses/index.js';
import { extractUsedClasses } from './utils/extractUsedClasses.js';
import { findFilesImportingCssModule } from './utils/findFilesImportingCssModule/index.js';

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
  const allAccesses: ClassAccess[] = [];

  for (const importingFileData of importingFilesData) {
    const sourceContent = getContentOfFiles({
      files: [importingFileData.file],
      srcDir,
    });

    const { isFileIgnored } = parseIgnoreComments(sourceContent);
    if (isFileIgnored) {
      // If file is ignored, treat all CSS classes as used from this file
      // This way ignored files don't cause false positives for unused classes
      for (const className of cssClasses) {
        usedClasses.add(className);
      }
      continue;
    }

    // Static usages (importName.foo / importName['foo']) are collected via a
    // dedicated pass so the long-standing ignore semantics of that path are
    // preserved. Dynamic access sites (variables, templates, ternaries) are
    // gathered separately for coverage analysis. The Set dedupes overlaps.
    const fileUsedClasses = extractUsedClasses({
      sourceContent,
      importNames: [importingFileData.importName],
      filePath: importingFileData.file,
    });
    for (const className of fileUsedClasses) {
      usedClasses.add(className);
    }

    allAccesses.push(
      ...extractClassAccesses(
        sourceContent,
        [importingFileData.importName],
        importingFileData.file
      )
    );
  }

  // Aggregate coverage across the whole module after gathering every access
  // site, so a covers-all expression in any file suppresses unused-checking
  // even if another file would have left some class uncovered.
  const { coveredClasses, coversAll, coversAllAccesses } = applyCoverage(
    cssClasses,
    allAccesses
  );

  if (coversAll) {
    const dynamicUsages: DynamicClassUsage[] = coversAllAccesses.map(
      (access) => ({
        className: access.display,
        file: access.file,
        line: access.line,
        column: access.column,
      })
    );

    return {
      file: cssFile,
      status: 'withDynamicImports',
      dynamicUsages,
    };
  }

  for (const className of coveredClasses) {
    usedClasses.add(className);
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
