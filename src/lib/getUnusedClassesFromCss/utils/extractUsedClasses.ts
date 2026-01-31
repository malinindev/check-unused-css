import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { parseIgnoreComments } from '../../../utils/parseIgnoreComments.js';
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

const isMemberExpressionWithClassName = (
  node: Node,
  importNames: string[]
): node is Node & {
  type: 'MemberExpression';
  property: { name: string; loc: NonNullable<Node['loc']> };
} => {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    importNames.includes(node.object.name) &&
    node.property.type === 'Identifier' &&
    !!node.property.loc
  );
};

const isMemberExpressionWithBracketNotation = (
  node: Node,
  importNames: string[]
): node is Node & {
  type: 'MemberExpression';
  property: {
    value: string;
    loc: NonNullable<Node['loc']>;
  };
} => {
  return (
    node.type === 'MemberExpression' &&
    node.computed &&
    node.object.type === 'Identifier' &&
    importNames.includes(node.object.name) &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string' &&
    !!node.property.loc
  );
};

export const extractUsedClasses = ({
  tsContent,
  importNames,
}: ExtractUsedClassesParams): string[] => {
  const ast: TSESTree.Program = contentToAst(tsContent);
  const usedClasses = new Set<string>();

  walk(ast as Node, {
    enter(node: Node): void {
      if (isMemberExpressionWithClassName(node, importNames)) {
        usedClasses.add(node.property.name);
      } else if (isMemberExpressionWithBracketNotation(node, importNames)) {
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
  const { ignoredLines } = parseIgnoreComments(tsContent);

  const ast: TSESTree.Program = contentToAst(tsContent);
  const usedClasses: UsedClassInfo[] = [];

  walk(ast as Node, {
    enter(node: Node): void {
      if (isMemberExpressionWithClassName(node, importNames)) {
        const lineNumber = node.property.loc.start.line;

        if (!ignoredLines.has(lineNumber)) {
          usedClasses.push({
            className: node.property.name,
            line: lineNumber,
            column: node.property.loc.start.column + 1, // AST columns are 0-based, but editors show 1-based
          });
        }
      } else if (isMemberExpressionWithBracketNotation(node, importNames)) {
        const lineNumber = node.property.loc.start.line;

        if (!ignoredLines.has(lineNumber)) {
          usedClasses.push({
            className: node.property.value,
            line: lineNumber,
            column: node.property.loc.start.column + 1, // AST columns are 0-based, but editors show 1-based
          });
        }
      }
    },
  });

  return usedClasses;
};
