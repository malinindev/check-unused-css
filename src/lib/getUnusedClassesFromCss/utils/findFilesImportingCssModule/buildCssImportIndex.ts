import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { extractCssImports } from './utils/extractCssImports.js';
import { resolveImportCandidates } from './utils/resolveImportCandidates.js';

export type CssModuleImporter = { file: string; importName: string };

/** Normalized CSS module path → the source files that import it. */
export type CssImportIndex = Map<string, CssModuleImporter[]>;

/**
 * Read every source file under `srcDir` once and record which CSS modules it
 * imports, so each module's importers are a map lookup instead of a fresh
 * scan of the whole source tree.
 */
export const buildCssImportIndex = async (
  srcDir: string
): Promise<CssImportIndex> => {
  const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: srcDir,
    nodir: true,
  });
  const index: CssImportIndex = new Map();

  const projectRoot = process.cwd();
  const isSrcDirProjectRoot =
    path.resolve(srcDir) === path.resolve(projectRoot);

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(srcDir, sourceFile);

    try {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const sourceDir = path.dirname(sourcePath);
      // A file importing the same module twice is listed once, under the
      // first import that resolves to it.
      const indexedPaths = new Set<string>();

      for (const { importName, importPath } of extractCssImports(
        sourceContent
      )) {
        const candidates = resolveImportCandidates({
          importPath,
          sourceDir,
          projectRoot,
          srcDir,
          isSrcDirProjectRoot,
        });

        for (const cssPath of candidates) {
          if (indexedPaths.has(cssPath)) {
            continue;
          }
          indexedPaths.add(cssPath);

          const importers = index.get(cssPath);
          if (importers) {
            importers.push({ file: sourceFile, importName });
          } else {
            index.set(cssPath, [{ file: sourceFile, importName }]);
          }
        }
      }
    } catch (error) {
      console.warn(
        `Warning: Could not read "${sourcePath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return index;
};
