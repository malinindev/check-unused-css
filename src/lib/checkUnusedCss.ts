import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

import type { UnusedClassResult } from '../types.js';
import { extractCssClasses } from './extractCssClasses.js';
import {
  findFilesImportingCssModule,
  getContentOfFiles,
} from './findFilesImportingCssModule.js';
import { findUnusedClasses } from './findUnusedClasses.js';
import { printResults } from './printResults.js';

const checkCssFile = async (
  cssFile: string,
  srcDir: string
): Promise<UnusedClassResult | null> => {
  const cssPath = path.join(srcDir, cssFile);
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  const cssClasses = extractCssClasses(cssContent);
  if (cssClasses.length === 0) return null;

  const importingFiles = await findFilesImportingCssModule(cssFile, srcDir);

  if (importingFiles.length === 0) {
    return {
      file: cssFile,
      unusedClasses: cssClasses,
    };
  }

  const relevantTsContent = getContentOfFiles(importingFiles, srcDir);
  const unusedClasses = findUnusedClasses(cssClasses, relevantTsContent);

  if (unusedClasses.length === 0) return null;

  return {
    file: cssFile,
    unusedClasses,
  };
};

export const checkUnusedCss = async (): Promise<void> => {
  console.log('Checking for unused CSS classes...\n');

  const srcDir = path.join(process.cwd(), 'src');

  const cssFiles = await glob('**/*.module.css', { cwd: srcDir });

  const results: UnusedClassResult[] = [];

  for (const cssFile of cssFiles) {
    const result = await checkCssFile(cssFile, srcDir);
    if (result) {
      results.push(result);
    }
  }

  printResults(results);

  if (results.length > 0) {
    process.exit(1);
  }
};
