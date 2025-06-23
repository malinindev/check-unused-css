export const findUnusedClasses = (
  cssClasses: string[],
  tsContent: string
): string[] => {
  const unusedClasses: string[] = [];

  for (const className of cssClasses) {
    const usageRegex = new RegExp(`styles\\.${className}\\b`, 'g');
    if (!usageRegex.test(tsContent)) {
      unusedClasses.push(className);
    }
  }

  return unusedClasses;
};
