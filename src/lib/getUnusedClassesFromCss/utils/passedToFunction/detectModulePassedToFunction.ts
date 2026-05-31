import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { contentToAst } from '../findUnusedClasses/utils/contentToAst.js';

export type PassedToFunctionSite = {
  line: number;
  column: number;
};

/**
 * Detect whether the whole imported CSS-module object (`importName`, e.g. `s`)
 * is passed as a *direct argument* to any function call in the source — the
 * case `responsiveClassNames(s, "--x", v)`, where a helper builds class keys
 * internally and the analyzer cannot see which classes are applied.
 *
 * Returns the location of the first such call site, or `null` if none.
 *
 * The trigger fires whenever a bare `Identifier` matching `importName` is a
 * direct element of *some* `CallExpression`'s `arguments`. That includes the
 * common composed form `classNames(s.root, responsiveClassNames(s, …))`, where
 * the whole object reaches the inner `responsiveClassNames` call — the object
 * still escapes into a function we cannot analyze, so the conservative,
 * zero-false-positive choice is to ignore the module.
 *
 * Deliberately NOT triggered by:
 *  - `fn(s.root, …)` — the argument is a `MemberExpression`, not the bare
 *    object; a property is already a concrete, observable class reference;
 *  - direct reads `s.foo` / `s["foo"]` / `` s[`foo-${x}`] `` — not call args;
 *  - `fn([s])`, `fn({ styles: s })` — `s` is wrapped in an array/object
 *    literal, not a direct call argument (out of scope; the object is not
 *    handed to the function as-is);
 *  - non-call uses: spread `{...s}`, `const x = s`, `return s`, JSX `prop={s}`;
 *  - `new Wrapper(s)` — a `NewExpression`, not a `CallExpression`.
 *
 * A source the parser cannot handle throws (via `contentToAst`), surfacing as
 * an INTERNAL error naming the offending file — the project's policy for
 * unparseable input.
 *
 * Like the other source-AST passes in this codebase (`extractUsedClasses`,
 * `extractClassAccesses`), this matches the import binding by name and does not
 * perform full scope resolution. A local variable or parameter that shadows the
 * import name and is itself passed to a function would therefore also trigger.
 * That is intentionally conservative: a spurious match only ever *ignores* a
 * module (suppressing reports), never produces a false unused/non-existent
 * finding — consistent with this feature's zero-false-positive priority. CSS
 * module bindings (`s`, `styles`) are module-scoped and not shadowed in
 * practice, so this has no observed effect on real codebases.
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
