import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse } from '@typescript-eslint/typescript-estree';

// In `.ts`/`.mts`/`.cts` files some angle-bracket syntax (type assertions like
// `<string[]>[]` and generic arrows like `<T>(x) => x`) is only valid when JSX
// is disabled; with JSX enabled the parser reads the `<...>` as a tag and
// fails. JSX-bearing extensions (`.tsx`/`.jsx`/`.js`) — and the no-path case —
// keep JSX enabled, since that syntax is forbidden there anyway.
const isJsxDisabledForExtension = (filePath?: string): boolean =>
  /\.[mc]?ts$/i.test(filePath ?? '');

export const contentToAst = (
  content: string,
  filePath?: string
): TSESTree.Program => {
  try {
    return parse(content, {
      loc: true,
      range: true,
      jsx: !isJsxDisabledForExtension(filePath),
      errorOnUnknownASTType: false,
      errorOnTypeScriptSyntacticAndSemanticIssues: false,
    });
  } catch (error) {
    const location = filePath ? ` "${filePath}"` : '';
    const reason = error instanceof Error ? error.message : 'unknown';
    throw new Error(`Failed to parse source content${location}: ${reason}`);
  }
};
