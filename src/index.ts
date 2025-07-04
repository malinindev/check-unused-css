#!/usr/bin/env node

import path from 'node:path';
import { glob } from 'glob';
import type { UnusedClassResult } from './types.js';
import { getUnusedClassesFromCss } from './lib/getUnusedClassesFromCss/index.js';
import { printResults } from './lib/printResults.js';
import { getArgs } from './utils/getArgs.js';

const DEFAULT_TARGET_PATH = 'src';

const runCssChecker = async (): Promise<void> => {
  try {
    const { targetPath } = getArgs();

    console.log('Checking for unused CSS classes...\n');

    const srcDir = path.join(process.cwd(), targetPath || DEFAULT_TARGET_PATH);
    const cssFiles = await glob('**/*.module.{css,scss,sass}', {
      cwd: srcDir,
    });

    const results: UnusedClassResult[] = [];

    for (const cssFile of cssFiles) {
      const result = await getUnusedClassesFromCss({ cssFile, srcDir });

      if (result) {
        results.push(result);
      }
    }

    printResults(results);

    const hasUnusedClasses = results.some(
      (result) => result.status === 'correct' && result.unusedClasses.length > 0
    );

    const hasNotImportedModules = results.some(
      (result) => result.status === 'notImported'
    );

    if (hasUnusedClasses || hasNotImportedModules) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

runCssChecker();
