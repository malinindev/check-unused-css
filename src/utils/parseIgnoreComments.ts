export const IGNORE_COMMENT_PATTERNS = {
  disable: /check-unused-css-disable(?!-next-line)/,
  disableNextLine: /check-unused-css-disable-next-line/,
} as const;

export type IgnoreInfo = {
  isFileIgnored: boolean;
  ignoredLines: Set<number>;
};

type ParseState = {
  isFileIgnored: boolean;
  ignoredLines: Set<number>;
  inBlockComment: boolean;
  blockCommentContent: string;
};

// Compile regex once for performance
const SINGLE_LINE_COMMENT_REGEX = /\/\/(.*)/;
const BLOCK_COMMENT_REGEX = /\/\*(.*?)\*\//g;

const checkIgnoreDirectives = (
  commentContent: string,
  lineNumber: number,
  state: ParseState
): void => {
  const trimmed = commentContent.trim();

  if (IGNORE_COMMENT_PATTERNS.disable.test(trimmed)) {
    state.isFileIgnored = true;
  }
  if (IGNORE_COMMENT_PATTERNS.disableNextLine.test(trimmed)) {
    state.ignoredLines.add(lineNumber + 1);
  }
};

const processSingleLineComment = (
  line: string,
  lineNumber: number,
  state: ParseState
): void => {
  const match = line.match(SINGLE_LINE_COMMENT_REGEX);
  if (match?.[1]) {
    checkIgnoreDirectives(match[1], lineNumber, state);
  }
};

const processSingleLineBlockComments = (
  line: string,
  lineNumber: number,
  state: ParseState
): boolean => {
  let found = false;

  for (const match of line.matchAll(BLOCK_COMMENT_REGEX)) {
    if (match[1]) {
      checkIgnoreDirectives(match[1], lineNumber, state);
      found = true;
    }
  }

  return found;
};

const processMultiLineBlockCommentContinuation = (
  line: string,
  lineNumber: number,
  state: ParseState
): void => {
  const endIndex = line.indexOf('*/');

  if (endIndex === -1) {
    state.blockCommentContent += `${line}\n`;
    return;
  }

  state.blockCommentContent += line.substring(0, endIndex);
  checkIgnoreDirectives(state.blockCommentContent, lineNumber, state);
  state.inBlockComment = false;
  state.blockCommentContent = '';
};

const processMultiLineBlockCommentStart = (
  line: string,
  lineNumber: number,
  state: ParseState
): boolean => {
  const startIndex = line.indexOf('/*');
  if (startIndex === -1) {
    return false;
  }

  const afterStart = line.substring(startIndex + 2);
  const endIndex = afterStart.indexOf('*/');

  if (endIndex !== -1) {
    const content = afterStart.substring(0, endIndex);
    checkIgnoreDirectives(content, lineNumber, state);
  } else {
    state.inBlockComment = true;
    state.blockCommentContent = afterStart;
  }

  return true;
};

/**
 * Parses ignore comments from source content (CSS or TS).
 */
export const parseIgnoreComments = (content: string): IgnoreInfo => {
  const state: ParseState = {
    isFileIgnored: false,
    ignoredLines: new Set<number>(),
    inBlockComment: false,
    blockCommentContent: '',
  };

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const lineNumber = i + 1;

    if (state.inBlockComment) {
      processMultiLineBlockCommentContinuation(line, lineNumber, state);
      continue;
    }

    const hasBlockComment = processSingleLineBlockComments(
      line,
      lineNumber,
      state
    );

    if (!hasBlockComment) {
      processMultiLineBlockCommentStart(line, lineNumber, state);
    }

    processSingleLineComment(line, lineNumber, state);
  }

  return {
    isFileIgnored: state.isFileIgnored,
    ignoredLines: state.ignoredLines,
  };
};
