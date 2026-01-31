import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { extractCssImports } from './utils/extractCssImports.js';
import { resolveImportPath } from './utils/resolveImportPath.js';

export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string
): Promise<Array<{ file: string; importName: string }>> => {
  const tsFiles = await glob('**/*.{ts,tsx}', { cwd: srcDir });
  const importingFiles: Array<{ file: string; importName: string }> = [];

  const projectRoot = process.cwd();
  const srcDirResolved = path.resolve(srcDir);
  const projectRootResolved = path.resolve(projectRoot);
  const isSrcDirProjectRoot = srcDirResolved === projectRootResolved;
  const normalizedCssPath = path.normalize(path.join(srcDir, cssFile));

  for (const tsFile of tsFiles) {
    const tsPath = path.join(srcDir, tsFile);

    try {
      const stats = fs.statSync(tsPath);
      if (!stats.isFile()) {
        continue;
      }

      const tsContent = fs.readFileSync(tsPath, 'utf-8');
      const cssImports = extractCssImports(tsContent);

      for (const { importName, importPath } of cssImports) {
        const tsDir = path.dirname(tsPath);

        const isMatch = resolveImportPath({
          importPath,
          tsDir,
          normalizedCssPath,
          projectRoot,
          srcDir,
          isSrcDirProjectRoot,
        });

        if (isMatch) {
          importingFiles.push({ file: tsFile, importName });
          break;
        }
      }
    } catch (error) {
      const errorCode =
        error instanceof Error && 'code' in error ? error.code : '';
      console.warn(
        `Warning: Could not read "${tsPath}": ${error instanceof Error ? error.message : String(error)}`
      );
      if (errorCode === 'EISDIR') {
        console.warn(
          `  This TypeScript file path points to a directory instead of a file`
        );
        console.warn(`  Original glob result: "${tsFile}"`);
      }
    }
  }

  return importingFiles;
};
