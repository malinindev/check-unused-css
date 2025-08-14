const trackBraceDepth = (char: string, currentDepth: number): number => {
  if (char === '{') {
    return currentDepth + 1;
  }
  if (char === '}') {
    return currentDepth - 1;
  }
  return currentDepth;
};

const processCharacter = (
  char: string,
  isInsideExpression: boolean
): string => {
  if (isInsideExpression) {
    return char;
  }

  return char === '\n' ? '\n' : ' ';
};

const processJSXTextContent = (textContent: string): string => {
  let result = '';
  let braceDepth = 0;

  for (let i = 0; i < textContent.length; i++) {
    const char = textContent[i];

    if (char) {
      const newDepth = trackBraceDepth(char, braceDepth);
      const isInsideExpression = braceDepth > 0 || char === '{' || char === '}';

      result += processCharacter(char, isInsideExpression);

      braceDepth = newDepth;
    }
  }

  return result;
};

// Remove JSX text content that can confuse string literal detection
export const cleanJSXText = (content: string): string => {
  // First, remove JSX comments {/* ... */} completely
  let result = content.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (match) => {
    // Replace with spaces to preserve character positions for error reporting
    return ' '.repeat(match.length);
  });

  // Then handle complex cases like: <tag>text {expression} more text</tag>
  result = result.replace(/>([^<]*?)</g, (_, textContent) => {
    const processedContent = processJSXTextContent(textContent);
    return `>${processedContent}<`;
  });

  return result;
};
