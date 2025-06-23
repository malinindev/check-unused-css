import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

export const findFilesImportingCssModule = async (
  cssFile: string,
  srcDir: string
): Promise<string[]> => {
  const tsFiles = await glob('**/*.{ts,tsx}', { cwd: srcDir });
  const importingFiles: string[] = [];

  for (const tsFile of tsFiles) {
    const tsPath = path.join(srcDir, tsFile);
    const tsContent = fs.readFileSync(tsPath, 'utf-8');

    const tsDir = path.dirname(tsPath);
    const cssPath = path.join(srcDir, cssFile);
    const relativeCssPath = path.relative(tsDir, cssPath);

    const normalizedPath = relativeCssPath.replace(/\\/g, '/');

    const importPatterns = [
      `from\\s+['"]${normalizedPath}['"]`,
      `from\\s+['"]\\./${normalizedPath}['"]`,
      `from\\s+['"]\\.\\./${normalizedPath}['"]`,
    ];

    const hasImport = importPatterns.some((pattern) => {
      const regex = new RegExp(pattern, 'g');
      return regex.test(tsContent);
    });

    if (hasImport) {
      importingFiles.push(tsFile);
    }
  }

  return importingFiles;
};

export const getContentOfFiles = (files: string[], srcDir: string): string => {
  let content = '';
  for (const file of files) {
    const filePath = path.join(srcDir, file);
    content += `${fs.readFileSync(filePath, 'utf-8')}\n`;
  }
  return content;
};
