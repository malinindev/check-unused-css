#!/usr/bin/env node

import path from 'node:path';
import { glob } from 'glob';
import type { UnusedClassResult } from './types.js';
import { analyzeUnusedCssClasses } from './lib/analyzeUnusedCssClasses/index.js';
import { printResults } from './lib/printResults.js';
import { getArgs } from './utils/getArgs.js';

const DEFAULT_TARGET_PATH = 'src';

const runCssChecker = async (): Promise<void> => {
  try {
    const { targetPath } = getArgs();

    console.log('Checking for unused CSS classes...\n');

    const srcDir = path.join(process.cwd(), targetPath || DEFAULT_TARGET_PATH);
    const cssFiles = await glob('**/*.{module.css,module.scss,module.sass}', {
      cwd: srcDir,
    });

    const results: UnusedClassResult[] = [];

    for (const cssFile of cssFiles) {
      const result = await analyzeUnusedCssClasses(cssFile, srcDir);

      if (result) {
        results.push(result);
      }
    }

    printResults(results);

    const hasUnusedClasses = results.some(
      (result) => result.unusedClasses.length > 0
    );

    if (hasUnusedClasses) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

runCssChecker();
