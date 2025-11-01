export const IGNORE_COMMENT_PATTERNS = {
  disable: /check-unused-css-disable(?!-next-line)/,
  disableNextLine: /check-unused-css-disable-next-line/,
} as const;

export type IgnoreInfo = {
  isFileIgnored: boolean;
  ignoredLines: Set<number>;
};

type ParseOptions = {
  supportSingleLineComments: boolean;
  supportBlockComments: boolean;
};

const processCommentContent = (
  commentContent: string,
  lineNumber: number,
  ignoredLines: Set<number>
): { isFileIgnored: boolean } => {
  const trimmedContent = commentContent.trim();
  let isFileIgnored = false;

  if (IGNORE_COMMENT_PATTERNS.disable.test(trimmedContent)) {
    isFileIgnored = true;
  }
  if (IGNORE_COMMENT_PATTERNS.disableNextLine.test(trimmedContent)) {
    ignoredLines.add(lineNumber + 1);
  }

  return { isFileIgnored };
};

const processSingleLineComment = (
  line: string,
  lineNumber: number,
  ignoredLines: Set<number>
): boolean => {
  const lineCommentMatch = line.match(/\/\/(.*)/);
  if (!lineCommentMatch?.[1]) {
    return false;
  }

  const result = processCommentContent(
    lineCommentMatch[1],
    lineNumber,
    ignoredLines
  );
  return result.isFileIgnored;
};

const parseIgnoreComments = (
  content: string,
  options: ParseOptions
): IgnoreInfo => {
  const ignoredLines = new Set<number>();
  let isFileIgnored = false;

  const lines = content.split('\n');
  let inBlockComment = false;
  let blockCommentContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const lineNumber = i + 1;

    if (!options.supportBlockComments) {
      if (!options.supportSingleLineComments) continue;
      const fileIgnored = processSingleLineComment(
        line,
        lineNumber,
        ignoredLines
      );
      if (fileIgnored) {
        isFileIgnored = true;
      }
      continue;
    }

    if (inBlockComment) {
      const blockCommentEnd = line.indexOf('*/');
      if (blockCommentEnd === -1) {
        blockCommentContent += `${line}\n`;
        continue;
      }

      blockCommentContent += line.substring(0, blockCommentEnd);
      inBlockComment = false;

      const result = processCommentContent(
        blockCommentContent,
        lineNumber,
        ignoredLines
      );
      if (result.isFileIgnored) {
        isFileIgnored = true;
      }

      blockCommentContent = '';
      continue;
    }

    const singleLineBlockCommentMatch = line.match(/\/\*(.*?)\*\//);
    if (singleLineBlockCommentMatch?.[1]) {
      const result = processCommentContent(
        singleLineBlockCommentMatch[1],
        lineNumber,
        ignoredLines
      );
      if (result.isFileIgnored) {
        isFileIgnored = true;
      }
      continue;
    }

    const blockCommentStart = line.indexOf('/*');
    if (blockCommentStart !== -1) {
      inBlockComment = true;
      blockCommentContent = line.substring(blockCommentStart + 2);

      const blockCommentEnd = line.indexOf('*/', blockCommentStart + 2);
      if (blockCommentEnd !== -1) {
        blockCommentContent = blockCommentContent.substring(
          0,
          blockCommentEnd - blockCommentStart - 2
        );
        inBlockComment = false;

        const result = processCommentContent(
          blockCommentContent,
          lineNumber,
          ignoredLines
        );
        if (result.isFileIgnored) {
          isFileIgnored = true;
        }

        blockCommentContent = '';
      }
      continue;
    }

    if (!options.supportSingleLineComments) continue;
    const fileIgnored = processSingleLineComment(
      line,
      lineNumber,
      ignoredLines
    );
    if (fileIgnored) {
      isFileIgnored = true;
    }
  }

  return { isFileIgnored, ignoredLines };
};

export const parseIgnoreCommentsFromCss = (cssContent: string): IgnoreInfo => {
  return parseIgnoreComments(cssContent, {
    supportSingleLineComments: true,
    supportBlockComments: true,
  });
};

export const parseIgnoreCommentsFromTs = (tsContent: string): IgnoreInfo => {
  return parseIgnoreComments(tsContent, {
    supportSingleLineComments: true,
    supportBlockComments: true,
  });
};
