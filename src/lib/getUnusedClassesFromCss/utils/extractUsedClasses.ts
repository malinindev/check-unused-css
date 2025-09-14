import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { contentToAst } from './findUnusedClasses/utils/contentToAst.js';

type ExtractUsedClassesParams = {
  tsContent: string;
  importNames: string[];
};

export type UsedClassInfo = {
  className: string;
  line: number;
  column: number;
};

export const extractUsedClasses = ({
  tsContent,
  importNames,
}: ExtractUsedClassesParams): string[] => {
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

  return Array.from(usedClasses);
};

export const extractUsedClassesWithLocations = ({
  tsContent,
  importNames,
}: ExtractUsedClassesParams): UsedClassInfo[] => {
  const ast: TSESTree.Program = contentToAst(tsContent);
  const usedClasses: UsedClassInfo[] = [];

  walk(ast as Node, {
    enter(node: Node): void {
      // Handle: importName.className (dot notation)
      if (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.object.type === 'Identifier' &&
        importNames.includes(node.object.name) &&
        node.property.type === 'Identifier' &&
        node.property.loc
      ) {
        usedClasses.push({
          className: node.property.name,
          line: node.property.loc.start.line,
          column: node.property.loc.start.column + 1,
        });
      }

      // Handle: importName['className'] (bracket notation)
      if (
        node.type === 'MemberExpression' &&
        node.computed &&
        node.object.type === 'Identifier' &&
        importNames.includes(node.object.name) &&
        node.property.type === 'Literal' &&
        typeof node.property.value === 'string' &&
        node.property.loc
      ) {
        usedClasses.push({
          className: node.property.value,
          line: node.property.loc.start.line,
          column: node.property.loc.start.column + 1,
        });
      }
    },
  });

  return usedClasses;
};
