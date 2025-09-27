import type { DynamicClassUsage } from '../../../../../types.js';

export const extractDynamicClassUsages = (
  tsContent: string,
  importNames: string[],
  filePath: string
): DynamicClassUsage[] => {
  const dynamicUsages: DynamicClassUsage[] = [];

  for (const importName of importNames) {
    const importRegex = new RegExp(`\\b${importName}\\s*\\[`, 'g');
    let match: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern requires assignment in loop
    while ((match = importRegex.exec(tsContent)) !== null) {
      const startIndex = match.index + match[0].length - 1;
      let bracketCount = 1;
      let endIndex = startIndex + 1;

      // Find matching closing bracket
      while (endIndex < tsContent.length && bracketCount > 0) {
        if (tsContent[endIndex] === '[') {
          bracketCount++;
        } else if (tsContent[endIndex] === ']') {
          bracketCount--;
        }
        endIndex++;
      }

      if (bracketCount === 0) {
        const expression = tsContent.slice(startIndex + 1, endIndex - 1).trim();

        if (!expression) {
          continue;
        }

        // Skip simple string literals without variables: "className", 'className'
        if (/^['"][^'"]*['"]$/.test(expression)) {
          continue;
        }

        // Check for dynamic patterns
        const dynamicPatterns = [
          // Template strings with variables: `class${var}`
          /`[^`]*\$\{[^}]+\}[^`]*`/,
          // Variables without quotes: variable, obj.prop
          /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/,
          // Array access: arr[0], obj[key]
          /\[[^\]]+\]/,
          // Function calls: getClassName(), obj.method()
          /[a-zA-Z_$][a-zA-Z0-9_$.]*\([^)]*\)/,
          // Logical operators: ||, &&, ??
          /\|\||&&|\?\?/,
          // Ternary operator: condition ? a : b
          /\?[^:]*:/,
          // Mathematical operations: +, -, *, /
          /[+\-*/]/,
        ];

        if (dynamicPatterns.some((pattern) => pattern.test(expression))) {
          // Calculate line and column
          const beforeMatch = tsContent.slice(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const lastLineStart = beforeMatch.lastIndexOf('\n') + 1;
          const columnNumber = match.index - lastLineStart + 1;

          dynamicUsages.push({
            className: `${importName}[${expression}]`,
            file: filePath,
            line: lineNumber,
            column: columnNumber,
          });
        }
      }
    }
  }

  return dynamicUsages;
};
