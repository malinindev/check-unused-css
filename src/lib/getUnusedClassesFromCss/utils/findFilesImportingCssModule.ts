import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string
): Promise<Array<{ file: string; importName: string }>> => {
  const tsFiles = await glob('**/*.{ts,tsx}', { cwd: srcDir });
  const importingFiles: Array<{ file: string; importName: string }> = [];

  // Pre-compute project root and check if srcDir is the project root
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

        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Relative path
          const resolvedImportPath = path.resolve(tsDir, importPath);

          // Check if the resolved import path matches the CSS file
          if (path.normalize(resolvedImportPath) === normalizedCssPath) {
            importingFiles.push({ file: tsFile, importName });
            break;
          }
        } else {
          // Absolute path - try most likely path first, then fallback
          // Most common case: srcDir is project root (tests) or absolute import from srcDir
          const srcDirPath = path.normalize(path.resolve(srcDir, importPath));
          if (srcDirPath === normalizedCssPath) {
            importingFiles.push({ file: tsFile, importName });
            break;
          }

          // If srcDir is not project root, try project root paths
          if (!isSrcDirProjectRoot) {
            // Try from project root
            const projectRootPath = path.normalize(
              path.resolve(projectRoot, importPath)
            );
            if (projectRootPath === normalizedCssPath) {
              importingFiles.push({ file: tsFile, importName });
              break;
            }

            // Try with 'src/' prefix (handles '__tests__/...' imports)
            const srcPrefixedPath = path.normalize(
              path.resolve(projectRoot, 'src', importPath)
            );
            if (srcPrefixedPath === normalizedCssPath) {
              importingFiles.push({ file: tsFile, importName });
              break;
            }
          }
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
