import type { UnusedClassResult } from '../types.js';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
} as const;

export const printResults = (results: UnusedClassResult[]): void => {
  const resultsWithUnusedClasses = results.filter(
    (result) => result.unusedClasses.length > 0
  );
  const resultsWithDynamicUsage = results.filter(
    (result) => result.hasDynamicUsage
  );

  if (resultsWithDynamicUsage.length > 0) {
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
  } else {
    console.log(`${COLORS.green}✓ No unused CSS classes found!${COLORS.reset}`);
  }
};
