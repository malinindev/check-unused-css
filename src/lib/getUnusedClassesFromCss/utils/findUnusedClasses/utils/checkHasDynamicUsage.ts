export const checkHasDynamicUsage = (
  tsContent: string,
  importNames: string[]
): boolean => {
  return importNames.some((importName) => {
    const dynamicPatterns = [
      // Template strings with variables: styles[`class${var}`]
      `\\b${importName}\\s*\\[\\s*\`[^\`]*\\$\\{[^}]+\\}[^\`]*\`\\s*\\]`,
      // Variables without quotes: styles[variable]
      `\\b${importName}\\s*\\[\\s*[a-zA-Z_$][a-zA-Z0-9_$]*\\s*\\]`,
      // Function calls: styles[getValue()]
      `\\b${importName}\\s*\\[\\s*[a-zA-Z_$][a-zA-Z0-9_$.()\\[\\]]*\\s*\\]`,
    ];

    return dynamicPatterns.some((pattern) => {
      const regex = new RegExp(pattern, 'g');
      return regex.test(tsContent);
    });
  });
};
