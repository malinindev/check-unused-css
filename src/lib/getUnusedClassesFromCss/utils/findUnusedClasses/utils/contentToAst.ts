import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

export const contentToAst = (content: string): TSESTree.Program => {
  try {
    return parse(content, {
      loc: false,
      range: false,
      jsx: true,
      errorOnUnknownASTType: false,
      errorOnTypeScriptSyntacticAndSemanticIssues: false,
    });
  } catch (error) {
    // If parsing fails, the file likely has syntax errors and bigger problems
    throw new Error(
      `Failed to parse TypeScript/JSX content: ${error instanceof Error ? error.message : 'unknown'}`
    );
  }
};
