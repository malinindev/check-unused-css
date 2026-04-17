#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { type GlobOptionsWithFileTypesFalse, glob } from 'glob';
import { COLORS, EXIT_CODES } from './consts.js';
import {
  applyChangePlan,
  buildChangePlan,
  type Candidate,
  type ChangePlan,
  type FilePlan,
  type RunSummary,
} from './lib/applyChangePlan/index.js';
import { getNonExistentClassesFromCss } from './lib/getNonExistentClassesFromCss.js';
import { getUnusedClassesFromCss } from './lib/getUnusedClassesFromCss/index.js';
import { printChangePlan } from './lib/printChangePlan.js';
import { printResults } from './lib/printResults.js';
import { printRunSummary } from './lib/printRunSummary.js';
import type { Args, CssAnalysisResult } from './types.js';
import { confirmPrompt } from './utils/confirmPrompt.js';
import { getArgs } from './utils/getArgs.js';
import { isStdinTty } from './utils/isTty.js';

const DEFAULT_TARGET_PATH = 'src';

type AnalysisContext = {
  args: Args;
  srcDir: string;
  cssFiles: string[];
  results: CssAnalysisResult[];
};

const runAnalysis = async (): Promise<AnalysisContext> => {
  const args = getArgs();
  const { targetPath, excludePatterns } = args;

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
    const fullCssPath = path.join(process.cwd(), cssFile);

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

  return { args, srcDir, cssFiles, results };
};

const reportMode = (ctx: AnalysisContext): never => {
  const { args, results } = ctx;
  printResults(results, args.noDynamic);

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
    (args.noDynamic && hasDynamicUsage)
  ) {
    process.exit(EXIT_CODES.REPORT_ISSUES);
  }

  process.exit(EXIT_CODES.OK);
};

const collectUnusedForRemoval = (
  ctx: AnalysisContext
): Array<{ file: string; cssSource: string; unusedClassNames: string[] }> => {
  const perFile: Array<{
    file: string;
    cssSource: string;
    unusedClassNames: string[];
  }> = [];

  for (const result of ctx.results) {
    if (result.status !== 'correct' || result.unusedClasses.length === 0) {
      continue;
    }
    const absolutePath = path.join(ctx.srcDir, result.file);
    let cssSource: string;
    try {
      cssSource = fs.readFileSync(absolutePath, 'utf-8');
    } catch {
      continue;
    }
    const unusedClassNames = result.unusedClasses.map((c) => c.className);
    perFile.push({
      file: absolutePath,
      cssSource,
      unusedClassNames,
    });
  }

  return perFile;
};

const buildSummary = (
  plan: ChangePlan,
  editResults: ReturnType<typeof applyChangePlan>,
  declinedByUser: boolean
): RunSummary => {
  const warnings: Array<Extract<Candidate, { kind: 'warn' }>> = [];
  for (const fp of plan.files) {
    warnings.push(...fp.warnings);
  }

  return {
    mode: plan.mode,
    filesModified: editResults.filter((r) => r.status === 'written').length,
    rulesRemoved: editResults.reduce((acc, r) => acc + r.rulesRemoved, 0),
    selectorsStripped: editResults.reduce(
      (acc, r) => acc + r.selectorsStripped,
      0
    ),
    filesEmptied: editResults.filter((r) => r.emptied).length,
    filesSkipped: editResults
      .filter((r) => r.status === 'failed' || r.status === 'skipped')
      .filter((r) => r.skipReason !== 'nothing to apply')
      .map((r) => ({
        file: r.file,
        reason: r.skipReason ?? 'unknown',
      })),
    warnings,
    declinedByUser,
  };
};

const planHasAnyActivity = (plan: ChangePlan): boolean =>
  plan.files.some(
    (fp: FilePlan) => fp.edits.length > 0 || fp.warnings.length > 0
  );

const removeMode = async (ctx: AnalysisContext): Promise<never> => {
  const { args } = ctx;
  const perFile = collectUnusedForRemoval(ctx);
  const plan = buildChangePlan({ perFile });

  if (!planHasAnyActivity(plan)) {
    console.log(`${COLORS.green}Nothing to remove.${COLORS.reset}`);
    process.exit(EXIT_CODES.OK);
  }

  printChangePlan(plan);

  const hasWritableEdits = plan.files.some((fp) => fp.edits.length > 0);

  if (!hasWritableEdits) {
    // Only warnings — nothing to write, but the user should still see them.
    // Exit 0 (warnings are informational).
    printRunSummary(buildSummary(plan, [], false));
    process.exit(EXIT_CODES.OK);
  }

  if (!args.yes) {
    if (!isStdinTty()) {
      console.error(
        `${COLORS.red}Refusing to run without a TTY. Re-run with --yes to proceed non-interactively.${COLORS.reset}`
      );
      process.exit(EXIT_CODES.BAD_ARGS);
    }
    const accepted = await confirmPrompt('Apply these changes? [y/N] ');
    if (!accepted) {
      printRunSummary(buildSummary(plan, [], true));
      process.exit(EXIT_CODES.DECLINED);
    }
  }

  const editResults = applyChangePlan(plan);
  printRunSummary(buildSummary(plan, editResults, false));

  const anyFailed = editResults.some((r) => r.status === 'failed');
  process.exit(anyFailed ? EXIT_CODES.REPORT_ISSUES : EXIT_CODES.OK);
};

const runCssChecker = async (): Promise<void> => {
  try {
    const ctx = await runAnalysis();
    if (ctx.args.mode === 'remove') {
      await removeMode(ctx);
    } else {
      reportMode(ctx);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(EXIT_CODES.REPORT_ISSUES);
  }
};

runCssChecker();
