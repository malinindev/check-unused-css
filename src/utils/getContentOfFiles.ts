import fs from 'node:fs';
import path from 'node:path';

type GetContentOfFilesParams = {
  files: string[];
  srcDir: string;
};

export const getContentOfFiles = ({
  files,
  srcDir,
}: GetContentOfFilesParams): string => {
  let content = '';

  for (const file of files) {
    const filePath = path.join(srcDir, file);

    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        content += `${fs.readFileSync(filePath, 'utf-8')}\n`;
      } else {
        console.warn(
          `Warning: Skipping "${filePath}" - ${stats.isDirectory() ? 'is a directory' : 'not a file'}`
        );
        if (stats.isSymbolicLink()) {
          console.warn(`  Note: This is a symbolic link`);
        }
      }
    } catch (error) {
      const errorCode =
        error instanceof Error && 'code' in error ? error.code : '';
      console.warn(
        `Warning: Could not read "${filePath}": ${error instanceof Error ? error.message : String(error)}`
      );
      if (errorCode === 'EISDIR') {
        console.warn(
          `  This error suggests the path points to a directory instead of a file`
        );
      }
    }
  }

  return content;
};
