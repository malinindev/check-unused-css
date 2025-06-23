export const extractCssClasses = (cssContent: string): string[] => {
  const classMatches = cssContent.match(/\.([a-zA-Z_][a-zA-Z0-9_-]*)\s*{/g);
  if (!classMatches) return [];

  return classMatches.map((match) =>
    match.replace(/^\./, '').replace(/\s*{$/, '')
  );
};
