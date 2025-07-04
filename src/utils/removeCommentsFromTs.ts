export const removeCommentsFromTs = (content: string): string => {
  let result = content;

  // Remove single-line comments, but be more careful about quotes
  // Only remove // if it's not preceded by : (to handle URLs like http://)
  result = result.replace(/(?<!:)\/\/.*$/gm, '');

  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  return result;
};
