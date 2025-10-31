import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { parseIgnoreCommentsFromTs } from '../../../utils/parseIgnoreComments.js';
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
  const { ignoredLines } = parseIgnoreCommentsFromTs(tsContent);

  const ast: TSESTree.Program = contentToAst(tsContent);
  const usedClasses = new Set<string>();
  const ignoredUsedClasses = new Set<string>();

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
        if (ignoredLines.has(node.property.loc.start.line)) {
          ignoredUsedClasses.add(node.property.name);
        } else {
          usedClasses.add(node.property.name);
        }
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
        if (ignoredLines.has(node.property.loc.start.line)) {
          ignoredUsedClasses.add(node.property.value);
        } else {
          usedClasses.add(node.property.value);
        }
      }
    },
  });

  // Return both used and ignored classes - they should all be treated as "used"
  // to avoid false positives for unused classes
  return Array.from(new Set([...usedClasses, ...ignoredUsedClasses]));
};

export const extractUsedClassesWithLocations = ({
  tsContent,
  importNames,
}: ExtractUsedClassesParams): UsedClassInfo[] => {
  const { ignoredLines } = parseIgnoreCommentsFromTs(tsContent);

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
        node.property.loc &&
        !ignoredLines.has(node.property.loc.start.line)
      ) {
        usedClasses.push({
          className: node.property.name,
          line: node.property.loc.start.line,
          column: node.property.loc.start.column + 1, // AST columns are 0-based, but editors show 1-based
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
        node.property.loc &&
        !ignoredLines.has(node.property.loc.start.line)
      ) {
        usedClasses.push({
          className: node.property.value,
          line: node.property.loc.start.line,
          column: node.property.loc.start.column + 1, // AST columns are 0-based, but editors show 1-based
        });
      }
    },
  });

  return usedClasses;
};
