import fs from 'node:fs';
import path from 'node:path';

export const getContentOfFiles = (files: string[], srcDir: string): string => {
  let content = '';

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    content += `${fs.readFileSync(filePath, 'utf-8')}\n`;
  }

  return content;
};
