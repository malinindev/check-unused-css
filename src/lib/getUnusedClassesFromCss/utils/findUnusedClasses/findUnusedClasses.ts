import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import type { DynamicClassUsage } from '../../../../types.js';
import { parseIgnoreComments } from '../../../../utils/parseIgnoreComments.js';
import { contentToAst } from './utils/contentToAst.js';
import { extractDynamicClassUsages } from './utils/extractDynamicClassUsages.js';

type FindUnusedClassesParams = {
  cssClasses: string[];
  tsContent: string;
  importNames: string[];
  filePath: string;
};

type FindUnusedClassesResult =
  | {
      unusedClasses: null;
      hasDynamicUsage: true;
      dynamicUsages: DynamicClassUsage[];
    }
  | { unusedClasses: string[]; hasDynamicUsage: false; dynamicUsages: null };

export const findUnusedClasses = ({
  cssClasses,
  tsContent,
  importNames,
  filePath,
}: FindUnusedClassesParams): FindUnusedClassesResult => {
  const { ignoredLines } = parseIgnoreComments(tsContent);

  const unusedClasses: string[] = [];

  // Check for dynamic usage patterns first
  const dynamicUsages = extractDynamicClassUsages(
    tsContent,
    importNames,
    filePath
  );

  if (dynamicUsages.length > 0) {
    return { hasDynamicUsage: true, unusedClasses: null, dynamicUsages };
  }

  const ast: TSESTree.Program = contentToAst(tsContent);

  const usedClasses = new Set<string>();

  walk(ast as Node, {
    enter(node: Node): void {
      // Handle: importName.className (dot notation)
      if (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.object.type === 'Identifier' &&
        importNames.includes(node.object.name) &&
        node.property.type === 'Identifier' &&
        node.property.loc &&
        !ignoredLines.has(node.property.loc.start.line)
      ) {
        usedClasses.add(node.property.name);
      }

      // Handle: importName['className'] (bracket notation)
      if (
        node.type === 'MemberExpression' &&
        node.computed &&
        node.object.type === 'Identifier' &&
        importNames.includes(node.object.name) &&
        node.property.type === 'Literal' &&
        typeof node.property.value === 'string' &&
        node.property.loc &&
        !ignoredLines.has(node.property.loc.start.line)
      ) {
        usedClasses.add(node.property.value);
      }
    },
  });

  // Check which classes are unused
  for (const className of cssClasses) {
    if (!usedClasses.has(className)) {
      unusedClasses.push(className);
    }
  }

  return { unusedClasses, hasDynamicUsage: false, dynamicUsages: null };
};
