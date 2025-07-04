export const checkHasDynamicUsage = (
  tsContent: string,
  importNames: string[]
): boolean => {
  return importNames.some((importName) => {
    // Find all bracket expressions for this import
    // Use a more sophisticated regex to handle nested brackets
    const importRegex = new RegExp(`\\b${importName}\\s*\\[`, 'g');
    let startMatch: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern requires assignment in loop
    while ((startMatch = importRegex.exec(tsContent)) !== null) {
      const startIndex = startMatch.index + startMatch[0].length - 1; // Position of opening bracket
      let bracketCount = 1;
      let endIndex = startIndex + 1;

      // Find matching closing bracket, accounting for nested brackets
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
        // But allow template strings with variables: `class${var}`
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

        // If any dynamic pattern matches, this is dynamic usage
        if (dynamicPatterns.some((pattern) => pattern.test(expression))) {
          return true;
        }
      }
    }

    return false;
  });
};
