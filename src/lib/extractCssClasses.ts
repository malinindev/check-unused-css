export const extractCssClasses = (cssContent: string): string[] => {
  const cleanedContent = cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@keyframes[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    .replace(/:global[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    .replace(/url\([^)]*\)/g, '');

  const selectorMatches = cleanedContent.match(/[^{}]+(?=\s*\{)/g);
  if (!selectorMatches) return [];

  const classNames = new Set<string>();

  for (const selector of selectorMatches) {
    const classMatches = selector.match(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g);

    if (!classMatches) {
      continue;
    }

    for (const match of classMatches) {
      const className = match.replace(/^\./, '');
      classNames.add(className);
    }
  }

  return Array.from(classNames);
};
