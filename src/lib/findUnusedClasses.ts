export const findUnusedClasses = (
  cssClasses: string[],
  tsContent: string,
  importNames: string[]
): { unusedClasses: string[]; hasDynamicUsage: boolean } => {
  const unusedClasses: string[] = [];

  const hasDynamicUsage = importNames.some((importName) => {
    const dynamicUsageRegex = new RegExp(`${importName}\\s*\\[`, 'g');
    return dynamicUsageRegex.test(tsContent);
  });

  for (const className of cssClasses) {
    const isUsed = importNames.some((importName) => {
      const directUsageRegex = new RegExp(
        `${importName}\\.${className}\\b`,
        'g'
      );

      const stringUsageRegex = new RegExp(`['"\`]${className}['"\`]`, 'g');

      return (
        directUsageRegex.test(tsContent) || stringUsageRegex.test(tsContent)
      );
    });

    if (!isUsed) {
      unusedClasses.push(className);
    }
  }

  return { unusedClasses, hasDynamicUsage };
};
