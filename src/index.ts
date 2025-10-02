#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { type GlobOptionsWithFileTypesFalse, glob } from 'glob';
import { COLORS } from './consts.js';
import { getNonExistentClassesFromCss } from './lib/getNonExistentClassesFromCss.js';
import { getUnusedClassesFromCss } from './lib/getUnusedClassesFromCss/index.js';
import { printResults } from './lib/printResults.js';
import type { CssAnalysisResult } from './types.js';
import { getArgs } from './utils/getArgs.js';

const DEFAULT_TARGET_PATH = 'src';

const runCssChecker = async (): Promise<void> => {
  try {
    const { targetPath, excludePatterns, noDynamic } = getArgs();

    console.log('Checking for unused CSS classes...\n');

    const srcDir = path.join(process.cwd(), targetPath || DEFAULT_TARGET_PATH);

    if (!fs.existsSync(srcDir)) {
      console.log(
        `${COLORS.red}Error: Directory "${targetPath || DEFAULT_TARGET_PATH}" does not exist.${COLORS.reset}`
      );

      process.exit(1);
    }

    if (!fs.statSync(srcDir).isDirectory()) {
      console.log(
        `${COLORS.red}Error: "${targetPath || DEFAULT_TARGET_PATH}" is a file. Please provide a directory path.${COLORS.reset}`
      );

      process.exit(1);
    }

    const globOptions: GlobOptionsWithFileTypesFalse = {
      cwd: process.cwd(),
      withFileTypes: false,
    };

    if (excludePatterns && excludePatterns.length > 0) {
      globOptions.ignore = excludePatterns;
    }

    const searchPattern = path
      .join(targetPath || DEFAULT_TARGET_PATH, '**/*.module.{css,scss,sass}')
      .replace(/\\/g, '/');
    const cssFiles = await glob(searchPattern, globOptions);

    const results: CssAnalysisResult[] = [];

    for (const cssFile of cssFiles) {
      // cssFile is now relative to project root, need to make it relative to srcDir
      const fullCssPath = path.join(process.cwd(), cssFile);

      // Check if the CSS file actually exists and is a file
      try {
        const cssStats = fs.statSync(fullCssPath);
        if (!cssStats.isFile()) {
          console.warn(`Warning: Skipping "${cssFile}" - not a file`);
          continue;
        }
      } catch (error) {
        console.warn(
          `Warning: Could not access "${cssFile}": ${error instanceof Error ? error.message : String(error)}`
        );
        continue;
      }

      const relativeCssFile = path.relative(srcDir, fullCssPath);

      // Ensure the file is inside srcDir using robust absolute path check
      const resolvedSrcDir = path.resolve(srcDir) + path.sep;
      const resolvedCssFile = path.resolve(fullCssPath);
      if (!resolvedCssFile.startsWith(resolvedSrcDir)) {
        console.warn(
          `Warning: Skipping "${cssFile}" - outside of source directory`
        );
        continue;
      }

      const unusedResult = await getUnusedClassesFromCss({
        cssFile: relativeCssFile,
        srcDir,
      });

      const nonExistentResult = await getNonExistentClassesFromCss({
        cssFile: relativeCssFile,
        srcDir,
      });

      if (unusedResult) {
        results.push(unusedResult);
      }

      if (nonExistentResult) {
        results.push(nonExistentResult);
      }
    }

    printResults(results, noDynamic);

    const hasUnusedClasses = results.some(
      (result) => result.status === 'correct' && result.unusedClasses.length > 0
    );

    const hasNotImportedModules = results.some(
      (result) => result.status === 'notImported'
    );

    const hasDynamicUsage = results.some(
      (result) => result.status === 'withDynamicImports'
    );

    const hasNonExistentClasses = results.some(
      (result) =>
        result.status === 'nonExistentClasses' &&
        result.nonExistentClasses.length > 0
    );

    if (
      hasUnusedClasses ||
      hasNotImportedModules ||
      hasNonExistentClasses ||
      (noDynamic && hasDynamicUsage)
    ) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);

    process.exit(1);
  }
};

runCssChecker();
