import fs from 'node:fs';
import path from 'node:path';
import { extractCssClasses } from '../extractCssClasses/index.js';
import { extractScssImportPaths } from './extractScssImportPaths.js';
import { resolveScssImport } from './resolveScssImport.js';

/**
 * Collects every class name reachable from a CSS module through `@use`,
 * `@forward` and the legacy `@import`, following the chain transitively. These
 * classes are emitted into the module's compiled CSS, so for the module they
 * are real classes — used here to stop reporting them as "non-existent" and to
 * avoid flagging them as unused (issue #90).
 *
 * The walk is breadth-first over resolved absolute paths and guards against
 * cycles (legal with `@import`) and diamonds via a visited set. The module's
 * own file is seeded as visited so its classes are not double-counted here —
 * they are already extracted by the caller.
 */
const SASS_EXTENSIONS = new Set(['.scss', '.sass']);

export const collectPartialClasses = (cssFilePath: string): Set<string> => {
  const classNames = new Set<string>();

  // Only Sass modules carry `@use`/`@forward`/`@import` that inline a partial's
  // rules. Plain `.css` modules cannot, so skip the read+parse entirely.
  if (!SASS_EXTENSIONS.has(path.extname(cssFilePath).toLowerCase())) {
    return classNames;
  }

  const visited = new Set<string>([path.resolve(cssFilePath)]);

  // Seed the queue with the module's own direct imports.
  let cssContent: string;
  try {
    cssContent = fs.readFileSync(cssFilePath, 'utf-8');
  } catch {
    return classNames;
  }

  const queue: string[] = [];
  const enqueueImportsFrom = (content: string, fromDir: string): void => {
    for (const spec of extractScssImportPaths(content)) {
      const resolved = resolveScssImport(spec, fromDir);
      if (resolved && !visited.has(resolved)) {
        visited.add(resolved);
        queue.push(resolved);
      }
    }
  };

  enqueueImportsFrom(cssContent, path.dirname(cssFilePath));

  // Index-based walk (not `queue.shift()`) keeps traversal O(n) on large graphs.
  for (let i = 0; i < queue.length; i++) {
    const partialPath = queue[i];
    if (!partialPath) {
      continue;
    }

    let partialContent: string;
    try {
      partialContent = fs.readFileSync(partialPath, 'utf-8');
    } catch {
      // The path resolved to an entry that can't be read (e.g. a race, or a
      // permission issue). Skip it silently — a genuinely missing partial is a
      // normal case (it never resolves and is never queued here).
      continue;
    }

    // A single malformed partial must not break the run — `extractCssClasses`
    // parses with postcss-scss and can throw on unsupported syntax. Warn (as
    // the selector parser does elsewhere) so the anomaly is visible, then move
    // on rather than aborting the whole analysis.
    let partialClassNames: string[];
    try {
      partialClassNames = extractCssClasses(partialContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `check-unused-css: failed to parse imported partial "${partialPath}" (${message}) — skipping it.`
      );
      partialClassNames = [];
    }
    for (const className of partialClassNames) {
      classNames.add(className);
    }

    enqueueImportsFrom(partialContent, path.dirname(partialPath));
  }

  return classNames;
};
