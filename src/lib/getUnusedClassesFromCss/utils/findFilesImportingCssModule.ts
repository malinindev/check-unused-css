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
    const tsContent = fs.readFileSync(tsPath, 'utf-8');

    const tsDir = path.dirname(tsPath);
    const cssPath = path.join(srcDir, cssFile);
    const relativeCssPath = path.relative(tsDir, cssPath);

    const normalizedPath = relativeCssPath.replace(/\\/g, '/');

    const importPatterns = [
      `import\\s+(\\w+)\\s+from\\s+['"]${normalizedPath}['"]`,
      `import\\s+(\\w+)\\s+from\\s+['"]\\./${normalizedPath}['"]`,
      `import\\s+(\\w+)\\s+from\\s+['"]\\.\\./${normalizedPath}['"]`,
    ];

    for (const pattern of importPatterns) {
      const regex = new RegExp(pattern, 'g');
      const match = regex.exec(tsContent);

      if (match?.[1]) {
        const importName = match[1];
        importingFiles.push({ file: tsFile, importName });
        break;
      }
    }
  }

  return importingFiles;
};
