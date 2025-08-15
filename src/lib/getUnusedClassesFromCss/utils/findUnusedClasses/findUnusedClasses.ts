import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { walk } from 'estree-walker';
import type { Node } from 'estree';
import { checkHasDynamicUsage } from './utils/checkHasDynamicUsage.js';
import { contentToAst } from './utils/contentToAst.js';

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

  // Check for dynamic usage patterns first
  if (checkHasDynamicUsage(tsContent, importNames)) {
    return { hasDynamicUsage: true, unusedClasses: null };
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
        node.property.type === 'Identifier'
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
        typeof node.property.value === 'string'
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

  return { unusedClasses, hasDynamicUsage: false };
};
