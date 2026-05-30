import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { contentToAst } from '../findUnusedClasses/utils/contentToAst.js';
import { classifyAccessKey } from './classifyAccessKey.js';
import type { ClassAccess } from './types.js';

const reconstructDisplay = (
  importName: string,
  property: TSESTree.Node,
  sourceContent: string
): string => {
  const range = property.range;
  if (range) {
    return `${importName}[${sourceContent.slice(range[0], range[1]).trim()}]`;
  }
  return `${importName}[...]`;
};

/**
 * Walk a source file and classify every CSS-module access (`importName.foo` or
 * `importName[expr]`) into a {@link ClassAccess}.
 *
 * Note: ignore comments (`check-unused-css-disable-next-line`) are deliberately
 * NOT applied here. Coverage must reflect every access that exists at runtime —
 * skipping a `coversAll` access on an ignored line would drop module-level
 * suppression and surface false-positive unused reports for classes referenced
 * only dynamically (which the directive could not even silence, since those
 * warnings point at the CSS file). This matches the long-standing behaviour of
 * the previous regex detector, which never consulted ignore comments, and is
 * consistent with the static pass of the unused-CSS path (`extractUsedClasses`),
 * which likewise applies only file-level `check-unused-css-disable`, not
 * per-line directives.
 *
 * A source the parser cannot handle throws (via `contentToAst`), surfacing as
 * an INTERNAL error naming the offending file — the project's deliberate policy
 * for unparseable input, rather than silently swallowing a broken file.
 */
export const extractClassAccesses = (
  sourceContent: string,
  importNames: string[],
  filePath?: string
): ClassAccess[] => {
  const file = filePath ?? '';

  const ast = contentToAst(sourceContent, filePath);

  const accesses: ClassAccess[] = [];

  walk(ast as Node, {
    enter(node: Node): void {
      const member = node as unknown as TSESTree.Node;
      if (member.type !== 'MemberExpression') {
        return;
      }
      if (
        member.object.type !== 'Identifier' ||
        !importNames.includes(member.object.name)
      ) {
        return;
      }

      const property = member.property;

      let classification: ClassAccess['classification'];
      if (member.computed) {
        classification = classifyAccessKey(property as TSESTree.Expression);
      } else if (property.type === 'Identifier') {
        classification = { kind: 'literals', classNames: [property.name] };
      } else {
        // styles.#private or other exotic non-computed keys: be conservative.
        classification = { kind: 'coversAll' };
      }

      // Report the column of the import identifier (e.g. `styles`) to preserve
      // the pre-existing dynamic-usage output format.
      const objectLoc = member.object.loc;
      accesses.push({
        classification,
        display: reconstructDisplay(
          member.object.name,
          property,
          sourceContent
        ),
        file,
        line: objectLoc ? objectLoc.start.line : -1,
        column: objectLoc ? objectLoc.start.column + 1 : -1,
      });
    },
  });

  return accesses;
};
