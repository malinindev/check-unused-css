import decomment from 'decomment';
import { checkIsInsideStringLiteral } from '../../../../utils/checkIsInsideStringLiteral.js';
import { checkHasDynamicUsage } from './utils/checkHasDynamicUsage.js';

type FindUnusedClassesParams = {
  cssClasses: string[];
  tsContent: string;
  importNames: string[];
};

type FindUnusedClassesResult =
  | { unusedClasses: null; hasDynamicUsage: true }
  | { unusedClasses: string[]; hasDynamicUsage: false };

type FindUnusedClasses = (
  params: FindUnusedClassesParams
) => FindUnusedClassesResult;

export const findUnusedClasses: FindUnusedClasses = ({
  cssClasses,
  tsContent,
  importNames,
}) => {
  const unusedClasses: string[] = [];

  // Check for dynamic usage patterns
  if (checkHasDynamicUsage(tsContent, importNames)) {
    return { hasDynamicUsage: true, unusedClasses: null };
  }

  const cleanContent = decomment(tsContent, { tolerant: true });

  for (const className of cssClasses) {
    const isUsed = importNames.some((importName) => {
      // Direct usage: importName.className
      const directUsageRegex = new RegExp(
        `\\b${importName}\\.${className}\\b`,
        'g'
      );

      // Bracket notation: importName['className'] or importName["className"]
      const bracketUsageRegex = new RegExp(
        `\\b${importName}\\s*\\[\\s*['"\`]${className}['"\`]\\s*\\]`,
        'g'
      );

      // Check direct usage
      let match: RegExpExecArray | null = null;
      directUsageRegex.lastIndex = 0;

      while (true) {
        match = directUsageRegex.exec(cleanContent);
        if (match === null) break;
        if (!checkIsInsideStringLiteral(cleanContent, match.index)) {
          return true;
        }
      }

      // Check bracket usage
      bracketUsageRegex.lastIndex = 0;

      while (true) {
        match = bracketUsageRegex.exec(cleanContent);
        if (match === null) break;
        if (!checkIsInsideStringLiteral(cleanContent, match.index)) {
          return true;
        }
      }

      return false;
    });

    if (!isUsed) {
      unusedClasses.push(className);
    }
  }

  return { unusedClasses, hasDynamicUsage: false };
};
