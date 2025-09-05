// Check if a match is inside a string literal (but not in template string interpolation)
export const checkIsInsideStringLiteral = (
  content: string,
  matchIndex: number
): boolean => {
  const beforeMatch = content.substring(0, matchIndex);

  // Track the current quote state and regex state
  let insideDoubleQuotes = false;
  let insideSingleQuotes = false;
  let insideBackticks = false;
  let insideRegex = false;

  for (let i = 0; i < beforeMatch.length; i++) {
    const char = beforeMatch[i];
    const prevChar = beforeMatch[i - 1];

    // Skip escaped quotes
    if (prevChar === '\\') continue;

    // Handle regex patterns
    if (
      char === '/' &&
      !insideDoubleQuotes &&
      !insideSingleQuotes &&
      !insideBackticks
    ) {
      if (insideRegex) {
        // End of regex
        insideRegex = false;
      } else {
        // Check if this is the start of a regex
        // Look back to see if this could be a regex start
        const beforeSlash = beforeMatch.substring(0, i).trim();
        const regexStartPattern = /(?:^|[=,({[\s;!&|?:])$/;
        if (regexStartPattern.test(beforeSlash)) {
          insideRegex = true;
        }
      }
    }

    // Handle quotes only if not inside regex
    if (!insideRegex) {
      if (char === '"' && !insideSingleQuotes && !insideBackticks) {
        insideDoubleQuotes = !insideDoubleQuotes;
      } else if (char === "'" && !insideDoubleQuotes && !insideBackticks) {
        insideSingleQuotes = !insideSingleQuotes;
      } else if (char === '`' && !insideDoubleQuotes && !insideSingleQuotes) {
        insideBackticks = !insideBackticks;
      }
    }
  }

  // If we're inside single or double quotes, it's a string literal
  if (insideSingleQuotes || insideDoubleQuotes) {
    return true;
  }

  // If we're inside template string, check for interpolation
  if (insideBackticks) {
    // Look for ${...} interpolation around our match
    const afterBacktick = beforeMatch.substring(beforeMatch.lastIndexOf('`'));
    const openBrace = afterBacktick.lastIndexOf('${');
    const afterMatch = content.substring(matchIndex);
    const closeBrace = afterMatch.indexOf('}');

    // If we're inside ${...}, it's code, not a string literal
    if (openBrace !== -1 && closeBrace !== -1) {
      return false;
    }

    // Otherwise, we're in the string part of template string
    return true;
  }

  return false;
};
