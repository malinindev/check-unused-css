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
import {
  type ClassAncestry,
  extractCssClassAncestry,
  extractCssClassesWithLocations,
} from './utils/extractCssClasses/index.js';
import { rescueUsedAncestors } from './utils/rescueUsedAncestors.js';
import { extractUsedClasses } from './utils/extractUsedClasses.js';
import { findFilesImportingCssModule } from './utils/findFilesImportingCssModule/index.js';
import { detectModulePassedToFunction } from './utils/passedToFunction/detectModulePassedToFunction.js';

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
  const ancestry: ClassAncestry = extractCssClassAncestry(cssContent);

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

    // The whole module passed to a function → we can't tell which classes it
    // uses, so ignore the module (one hand-off in any file is enough).
    const passedSite = detectModulePassedToFunction(
      sourceContent,
      importingFileData.importName,
      importingFileData.file
    );
    if (passedSite) {
      return {
        file: cssFile,
        status: 'ignoredPassedToFunction',
        sourceFile: importingFileData.file,
        importName: importingFileData.importName,
        line: passedSite.line,
        column: passedSite.column,
      };
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

  // A used child keeps its ampersand-family parent from looking unused. Runs
  // after every "used" signal (static, literal, dynamic coverage) is merged in.
  rescueUsedAncestors(usedClasses, ancestry);

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
