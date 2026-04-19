import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse } from '@typescript-eslint/typescript-estree';

export const contentToAst = (
  content: string,
  filePath?: string
): TSESTree.Program => {
  try {
    return parse(content, {
      loc: true,
      range: false,
      jsx: true,
      errorOnUnknownASTType: false,
      errorOnTypeScriptSyntacticAndSemanticIssues: false,
    });
  } catch (error) {
    const location = filePath ? ` "${filePath}"` : '';
    const reason = error instanceof Error ? error.message : 'unknown';
    throw new Error(`Failed to parse source content${location}: ${reason}`);
  }
};
