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
    content += `${fs.readFileSync(filePath, 'utf-8')}\n`;
  }

  return content;
};
