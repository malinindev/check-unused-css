export const IGNORE_COMMENT_PATTERNS = {
  disable: /check-unused-css-disable(?!-next-line)/,
  disableNextLine: /check-unused-css-disable-next-line/,
} as const;

export type IgnoreInfo = {
  isFileIgnored: boolean;
  ignoredLines: Set<number>;
};

export const parseIgnoreCommentsFromCss = (cssContent: string): IgnoreInfo => {
  const ignoredLines = new Set<number>();
  let isFileIgnored = false;

  const lines = cssContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const lineNumber = i + 1;

    const blockCommentMatch = line.match(/\/\*(.*?)\*\//);
    if (blockCommentMatch?.[1]) {
      const commentContent = blockCommentMatch[1];
      if (IGNORE_COMMENT_PATTERNS.disable.test(commentContent)) {
        isFileIgnored = true;
      }
      if (IGNORE_COMMENT_PATTERNS.disableNextLine.test(commentContent)) {
        ignoredLines.add(lineNumber + 1);
      }
    }

    const lineCommentMatch = line.match(/\/\/(.*)/);
    if (lineCommentMatch?.[1]) {
      const commentContent = lineCommentMatch[1];
      if (IGNORE_COMMENT_PATTERNS.disable.test(commentContent)) {
        isFileIgnored = true;
      }
      if (IGNORE_COMMENT_PATTERNS.disableNextLine.test(commentContent)) {
        ignoredLines.add(lineNumber + 1);
      }
    }
  }

  return { isFileIgnored, ignoredLines };
};

export const parseIgnoreCommentsFromTs = (tsContent: string): IgnoreInfo => {
  const ignoredLines = new Set<number>();
  let isFileIgnored = false;

  const lines = tsContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const lineNumber = i + 1;

    const singleLineCommentMatch = line.match(/\/\/(.*)/);
    if (singleLineCommentMatch?.[1]) {
      const commentContent = singleLineCommentMatch[1];
      if (IGNORE_COMMENT_PATTERNS.disable.test(commentContent)) {
        isFileIgnored = true;
      }
      if (IGNORE_COMMENT_PATTERNS.disableNextLine.test(commentContent)) {
        ignoredLines.add(lineNumber + 1);
      }
    }

    const blockCommentMatch = line.match(/\/\*(.*?)\*\//);
    if (blockCommentMatch?.[1]) {
      const commentContent = blockCommentMatch[1];
      if (IGNORE_COMMENT_PATTERNS.disable.test(commentContent)) {
        isFileIgnored = true;
      }
      if (IGNORE_COMMENT_PATTERNS.disableNextLine.test(commentContent)) {
        ignoredLines.add(lineNumber + 1);
      }
    }
  }

  return { isFileIgnored, ignoredLines };
};
