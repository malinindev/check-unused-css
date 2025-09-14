import { COLORS } from '../consts.js';
import type {
  UnusedClassResult,
  UnusedClassResultNoClasses,
  UnusedClassResultWithClasses,
} from '../types.js';

export const printResults = (
  results: UnusedClassResult[],
  noDynamic = false
): void => {
  const resultsWithUnusedClasses = results.filter(
    (result): result is UnusedClassResultWithClasses =>
      result.status === 'correct' && result.unusedClasses.length > 0
  );

  const resultsWithDynamicUsage = results.filter(
    (result): result is UnusedClassResultNoClasses =>
      result.status === 'withDynamicImports'
  );

  const notImportedResults = results.filter(
    (result): result is UnusedClassResultNoClasses =>
      result.status === 'notImported'
  );

  if (resultsWithDynamicUsage.length > 0) {
    if (noDynamic) {
      console.error(
        `${COLORS.red}Error: Dynamic class usage detected in ${resultsWithDynamicUsage.length} files.${COLORS.reset}`
      );
      console.error(
        `${COLORS.red}Cannot determine usability when using dynamic class access (e.g., styles[variable]).${COLORS.reset}\n`
      );

      for (const result of resultsWithDynamicUsage) {
        console.log(`  ${COLORS.red}${result.file}${COLORS.reset}`);
      }
      console.log('');
    } else {
      console.warn(
        `${COLORS.yellow}Warning: Dynamic class usage detected in ${resultsWithDynamicUsage.length} files.${COLORS.reset}`
      );
      console.warn(
        `${COLORS.yellow}Cannot determine usability when using dynamic class access (e.g., styles[variable]).${COLORS.reset}\n`
      );

      for (const result of resultsWithDynamicUsage) {
        console.log(`  ${COLORS.yellow}${result.file}${COLORS.reset}`);
      }
      console.log('');
    }
  }

  if (notImportedResults.length > 0) {
    console.log(
      `${COLORS.red}Found ${notImportedResults.length} not imported CSS modules:${COLORS.reset}\n`
    );

    for (const result of notImportedResults) {
      console.log(`${COLORS.cyan}${result.file}${COLORS.reset}`);
      console.log('');
    }
  }

  if (resultsWithUnusedClasses.length > 0) {
    const totalUnusedClasses = resultsWithUnusedClasses.reduce(
      (sum, result) => sum + result.unusedClasses.length,
      0
    );

    console.error(
      `${COLORS.red}Found ${totalUnusedClasses} unused CSS classes in ${resultsWithUnusedClasses.length} files:${COLORS.reset}\n`
    );

    for (const result of resultsWithUnusedClasses) {
      console.log(`${COLORS.cyan}${result.file}${COLORS.reset}`);

      for (const className of result.unusedClasses) {
        console.log(`  ${COLORS.yellow}.${className}${COLORS.reset}`);
      }

      console.log('');
    }
  } else if (notImportedResults.length === 0) {
    console.log(`${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`);
  }
};
