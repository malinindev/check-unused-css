import type { UnusedClassResult } from '../types.js';

export const printResults = (results: UnusedClassResult[]): void => {
  if (results.length === 0) {
    console.log('No unused CSS classes found!');
    return;
  }

  console.log('Found unused CSS classes:\n');

  for (const result of results) {
    console.log(`File: ${result.file}`);
    for (const className of result.unusedClasses) {
      console.log(`  - .${className}`);
    }
    console.log();
  }
};
