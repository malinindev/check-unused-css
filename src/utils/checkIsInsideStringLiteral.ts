// Check if a match is inside a string literal (but not in template string interpolation)
export const checkIsInsideStringLiteral = (
  content: string,
  matchIndex: number
): boolean => {
  const beforeMatch = content.substring(0, matchIndex);

  // Simple approach: count unescaped quotes
  let singleQuotes = 0;
  let doubleQuotes = 0;
  let backticks = 0;

  for (let i = 0; i < beforeMatch.length; i++) {
    const char = beforeMatch[i];
    const prevChar = beforeMatch[i - 1];

    // Skip escaped quotes
    if (prevChar === '\\') continue;

    if (char === "'") singleQuotes++;
    if (char === '"') doubleQuotes++;
    if (char === '`') backticks++;
  }

  // If we're inside single or double quotes, it's a string literal
  if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1) {
    return true;
  }

  // If we're inside template string, check for interpolation
  if (backticks % 2 === 1) {
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
