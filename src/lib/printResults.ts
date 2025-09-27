import { COLORS } from '../consts.js';
import type {
  CssAnalysisResult,
  DynamicClassResult,
  NonExistentClassResult,
  UnusedClassResultNoClasses,
  UnusedClassResultWithClasses,
} from '../types.js';
import { formatLocationLine } from './printUtils.js';

export const printResults = (
  results: CssAnalysisResult[],
  noDynamic = false
): void => {
  const resultsWithUnusedClasses = results.filter(
    (result): result is UnusedClassResultWithClasses =>
      result.status === 'correct' && result.unusedClasses.length > 0
  );

  const resultsWithDynamicUsage = results.filter(
    (result): result is DynamicClassResult =>
      result.status === 'withDynamicImports'
  );

  const notImportedResults = results.filter(
    (result): result is UnusedClassResultNoClasses =>
      result.status === 'notImported'
  );

  const nonExistentClassResults = results.filter(
    (result): result is NonExistentClassResult =>
      result.status === 'nonExistentClasses'
  );

  if (resultsWithDynamicUsage.length > 0) {
    if (noDynamic) {
      console.error(
        `${COLORS.red}Error: Dynamic class usage detected in ${resultsWithDynamicUsage.length} files.${COLORS.reset}`
      );
      console.error(
        `${COLORS.red}Cannot determine usability when using dynamic class access.${COLORS.reset}\n`
      );

      for (const result of resultsWithDynamicUsage) {
        for (const usage of result.dynamicUsages) {
          console.log(
            formatLocationLine(
              usage.file,
              usage.line,
              usage.column,
              usage.className,
              COLORS.red
            )
          );
        }

        console.log('');
      }
      console.log('');
    } else {
      console.warn(
        `${COLORS.yellow}Warning: Dynamic class usage detected in ${resultsWithDynamicUsage.length} files.${COLORS.reset}`
      );
      console.warn(
        `${COLORS.yellow}Cannot determine usability when using dynamic class access.${COLORS.reset}\n`
      );

      for (const result of resultsWithDynamicUsage) {
        for (const usage of result.dynamicUsages) {
          console.log(
            formatLocationLine(
              usage.file,
              usage.line,
              usage.column,
              usage.className,
              COLORS.yellow
            )
          );
        }

        console.log('');
      }
    }
  }

  if (nonExistentClassResults.length > 0) {
    const totalNonExistentClasses = nonExistentClassResults.reduce(
      (sum, result) => sum + result.nonExistentClasses.length,
      0
    );

    console.error(
      `${COLORS.red}Found ${totalNonExistentClasses} classes used in TypeScript but non-existent in CSS:${COLORS.reset}\n`
    );

    for (const result of nonExistentClassResults) {
      for (const usage of result.nonExistentClasses) {
        console.log(
          formatLocationLine(
            usage.file,
            usage.line,
            usage.column,
            usage.className,
            COLORS.red
          )
        );
      }

      console.log('');
    }
  }

  if (notImportedResults.length > 0) {
    console.log(
      `${COLORS.red}Found ${notImportedResults.length} not imported CSS modules:${COLORS.reset}\n`
    );

    for (const result of notImportedResults) {
      console.log(`  ${COLORS.cyan}${result.file}${COLORS.reset}`);
      console.log('');
    }
  }

  if (resultsWithUnusedClasses.length > 0) {
    const totalUnusedClasses = resultsWithUnusedClasses.reduce(
      (sum, result) => sum + result.unusedClasses.length,
      0
    );

    console.error(
      `${COLORS.red}Found ${totalUnusedClasses} classes defined in CSS but unused in TypeScript:${COLORS.reset}\n`
    );

    for (const result of resultsWithUnusedClasses) {
      for (const unusedClass of result.unusedClasses) {
        console.log(
          formatLocationLine(
            result.file,
            unusedClass.line,
            unusedClass.column,
            unusedClass.className,
            COLORS.red
          )
        );
      }

      console.log('');
    }
  } else if (
    notImportedResults.length === 0 &&
    nonExistentClassResults.length === 0
  ) {
    console.log(`${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`);
  }
};
