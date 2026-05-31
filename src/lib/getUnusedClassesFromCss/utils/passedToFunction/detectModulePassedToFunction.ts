import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { contentToAst } from '../findUnusedClasses/utils/contentToAst.js';

export type PassedToFunctionSite = {
  line: number;
  column: number;
};

/**
 * Find where the imported module object (`importName`) is passed straight into
 * a function call, e.g. `responsiveClassNames(s, "--x", v)`. The helper builds
 * class names internally, so we can't tell which classes it uses — the caller
 * uses this to ignore the module instead of reporting false positives.
 *
 * Triggers when `importName` is a bare argument of any call, including the
 * nested `classNames(s.root, responsiveClassNames(s, …))` form. Does NOT
 * trigger on `s.root` (a property, not the whole object), plain reads
 * (`s.foo`), or `s` wrapped in something else (`fn([s])`, `{ ...s }`, `new
 * Wrapper(s)`).
 *
 * Like the other AST passes here, it matches by name without scope resolution.
 * A shadowing local named `s` could trigger too, but that only ignores a module
 * (never a false finding) and doesn't happen with real module bindings.
 *
 * Returns the first call site, or `null`. Throws on unparseable input.
 */
export const detectModulePassedToFunction = (
  sourceContent: string,
  importName: string,
  filePath?: string
): PassedToFunctionSite | null => {
  const ast = contentToAst(sourceContent, filePath);

  let site: PassedToFunctionSite | null = null;

  walk(ast as Node, {
    enter(node: Node): void {
      if (site) {
        return;
      }

      const call = node as unknown as TSESTree.Node;
      if (call.type !== 'CallExpression') {
        return;
      }

      for (const arg of call.arguments) {
        if (arg.type === 'Identifier' && arg.name === importName) {
          const loc = arg.loc;
          site = {
            line: loc ? loc.start.line : -1,
            // AST columns are 0-based; editors show 1-based.
            column: loc ? loc.start.column + 1 : -1,
          };
          return;
        }
      }
    },
  });

  return site;
};
