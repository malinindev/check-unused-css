import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string
): Promise<Array<{ file: string; importName: string }>> => {
  const tsFiles = await glob('**/*.{ts,tsx}', { cwd: srcDir });
  const importingFiles: Array<{ file: string; importName: string }> = [];

  for (const tsFile of tsFiles) {
    const tsPath = path.join(srcDir, tsFile);

    try {
      const stats = fs.statSync(tsPath);
      if (!stats.isFile()) {
        continue; // Skip directories
      }

      const tsContent = fs.readFileSync(tsPath, 'utf-8');

      // Find all CSS imports in the TypeScript file
      const importRegex: RegExp =
        /import\s+(\w+)\s+from\s+['"]([^'"]+\.(?:css|scss|sass))['"];?/g;

      let match: RegExpExecArray | null = importRegex.exec(tsContent);

      while (match !== null) {
        const importName = match[1];
        const importPath = match[2];

        // Skip if import name or path is undefined
        if (!importName || !importPath) {
          match = importRegex.exec(tsContent);
          continue;
        }

        // Resolve the import path relative to the TypeScript file
        const tsDir = path.dirname(tsPath);
        let resolvedImportPath: string;

        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Relative path
          resolvedImportPath = path.resolve(tsDir, importPath);
        } else {
          // Absolute path from srcDir
          resolvedImportPath = path.resolve(srcDir, importPath);
        }

        // Normalize paths for comparison (handle different path separators, resolve .. and . segments)
        // This ensures cross-platform compatibility and resolves relative path segments
        const normalizedResolvedPath = path.normalize(resolvedImportPath);
        const normalizedCssPath = path.normalize(path.join(srcDir, cssFile));

        // Check if the resolved import path matches the CSS file we're analyzing
        if (normalizedResolvedPath === normalizedCssPath) {
          importingFiles.push({ file: tsFile, importName });
          break; // Found a match, no need to check other imports in this file
        }

        // Get next match
        match = importRegex.exec(tsContent);
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
