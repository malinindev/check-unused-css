import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { extractCssImports } from './utils/extractCssImports.js';
import { resolveImportPath } from './utils/resolveImportPath.js';

export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string
): Promise<Array<{ file: string; importName: string }>> => {
  const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    cwd: srcDir,
    nodir: true,
  });
  const importingFiles: Array<{ file: string; importName: string }> = [];

  const projectRoot = process.cwd();
  const srcDirResolved = path.resolve(srcDir);
  const projectRootResolved = path.resolve(projectRoot);
  const isSrcDirProjectRoot = srcDirResolved === projectRootResolved;
  const normalizedCssPath = path.normalize(path.join(srcDir, cssFile));

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(srcDir, sourceFile);

    try {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const cssImports = extractCssImports(sourceContent);

      for (const { importName, importPath } of cssImports) {
        const sourceDir = path.dirname(sourcePath);

        const isMatch = resolveImportPath({
          importPath,
          sourceDir,
          normalizedCssPath,
          projectRoot,
          srcDir,
          isSrcDirProjectRoot,
        });

        if (isMatch) {
          importingFiles.push({ file: sourceFile, importName });
          break;
        }
      }
    } catch (error) {
      console.warn(
        `Warning: Could not read "${sourcePath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return importingFiles;
};
