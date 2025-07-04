import fs from 'node:fs';
import path from 'node:path';

type GetContentOfFiles = (params: {
  files: string[];
  srcDir: string;
}) => string;

export const getContentOfFiles: GetContentOfFiles = ({ files, srcDir }) => {
  let content = '';

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    content += `${fs.readFileSync(filePath, 'utf-8')}\n`;
  }

  return content;
};
