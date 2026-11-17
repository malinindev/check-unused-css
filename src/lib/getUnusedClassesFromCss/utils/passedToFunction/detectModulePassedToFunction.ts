import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { Node } from 'estree';
import { walk } from 'estree-walker';
import { contentToAst } from '../findUnusedClasses/utils/contentToAst.js';

export type PassedToFunctionSite = {
  line: number;
  column: number;
};

// Children under these keys are TypeScript types, never runtime values, so
// `keyof typeof s` or `x as typeof s` does not hand the module anywhere.
const TYPE_KEYS = new Set([
  'typeAnnotation',
  'returnType',
  'typeParameters',
  'typeArguments',
  'superTypeArguments',
  'implements',
]);

// Nodes with no runtime value inside: type declarations, overload signatures,
// index signatures and `typeof` in a type.
const TYPE_ONLY_NODES = new Set([
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeQuery',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
  'TSIndexSignature',
]);

/**
 * Whether an identifier at `parent[key]` does not hand a value on: a property
 * key, a declared name (variables, parameters, destructuring targets), a
 * label, an export alias, or `typeof s` / `void s`. `patternProperties` holds
 * the `Property` nodes of object destructuring patterns.
 */
const isNotHandOff = (
  parent: TSESTree.Node,
  key: string,
  patternProperties: WeakSet<TSESTree.Node>
): boolean => {
  switch (parent.type) {
    case 'UnaryExpression':
      return parent.operator === 'typeof' || parent.operator === 'void';
    case 'Property':
      // In `{ a: s } = x` the value is a target; in `{ a: s }` it is a value.
      return (
        (key === 'key' && !parent.computed) ||
        (key === 'value' && patternProperties.has(parent))
      );
    case 'PropertyDefinition':
    case 'MethodDefinition':
    case 'AccessorProperty':
    case 'TSAbstractPropertyDefinition':
    case 'TSAbstractMethodDefinition':
    case 'TSAbstractAccessorProperty':
      return key === 'key' && !parent.computed;
    case 'ExportSpecifier':
      return key === 'exported';
    case 'VariableDeclarator':
    case 'ClassDeclaration':
    case 'ClassExpression':
    case 'TSEnumMember':
    case 'TSEnumDeclaration':
    case 'TSModuleDeclaration':
    case 'TSImportEqualsDeclaration':
      return key === 'id';
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return key === 'id' || key === 'params';
    case 'AssignmentPattern':
      return key === 'left';
    // `namespace A.s {}` or `import x = s.a`: a dotted name or a property
    // read, never the object itself.
    case 'TSQualifiedName':
    case 'ArrayPattern':
    case 'RestElement':
    case 'TSParameterProperty':
    case 'CatchClause':
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return true;
    default:
      return false;
  }
};

/**
 * Whether a node and everything under it can be skipped: imports, re-exports
 * from another module, type-only exports and type-only nodes.
 */
const isSkippedSubtree = (node: TSESTree.Node): boolean => {
  switch (node.type) {
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
    case 'MetaProperty':
      return true;
    case 'ExportNamedDeclaration':
      // `export { s } from './other'` names another module's export.
      return node.source !== null || node.exportKind === 'type';
    case 'ExportSpecifier':
      return node.exportKind === 'type';
    default:
      return TYPE_ONLY_NODES.has(node.type);
  }
};

/**
 * Find where the imported module object (`importName`) is handed on whole,
 * e.g. `responsiveClassNames(s, "--x", v)` or
 * `transitionProps={{ classNames: s }}`. The receiver reads classes we can't
 * see, so the caller uses this to ignore the module instead of reporting false
 * positives.
 *
 * Any value reference to `importName` counts, except a property read (`s.foo`,
 * `s["foo"]`, `s[key]`), which the access passes analyze. That covers call and
 * `new` arguments, object property values and shorthands, JSX props, spreads,
 * array elements, assignments, returns, type assertions and re-exports (issue
 * #108). The import itself, `typeof s`, `void s`, declared names that only
 * shadow it (`function C({ s })`) and type-only uses (`keyof typeof s`,
 * `export type { s }`) do not count.
 *
 * Like the other AST passes here, it matches by name without scope resolution.
 * A shadowing local named `s` could trigger too, but that only ignores a module
 * (never a false finding) and doesn't happen with real module bindings.
 *
 * Returns the first such reference, or `null`. Throws on unparseable input.
 */
export const detectModulePassedToFunction = (
  sourceContent: string,
  importName: string,
  filePath?: string
): PassedToFunctionSite | null => {
  const ast = contentToAst(sourceContent, filePath);

  let site: PassedToFunctionSite | null = null;
  const patternProperties = new WeakSet<TSESTree.Node>();

  walk(ast as Node, {
    enter(
      node: Node,
      parent: Node | null,
      key: PropertyKey | null | undefined
    ): void {
      if (site) {
        this.skip();
        return;
      }

      const current = node as unknown as TSESTree.Node;
      const parentNode = parent as unknown as TSESTree.Node | null;

      if (
        isSkippedSubtree(current) ||
        (typeof key === 'string' && TYPE_KEYS.has(key))
      ) {
        this.skip();
        return;
      }

      if (current.type === 'Property' && parentNode?.type === 'ObjectPattern') {
        patternProperties.add(current);
      }

      if (
        current.type !== 'Identifier' ||
        current.name !== importName ||
        !parentNode ||
        typeof key !== 'string'
      ) {
        return;
      }

      if (parentNode.type === 'MemberExpression') {
        // `s.foo` / `s[key]` is a property read; `x.s` is not `s` at all.
        return;
      }

      if (isNotHandOff(parentNode, key, patternProperties)) {
        return;
      }

      const loc = current.loc;
      site = {
        line: loc ? loc.start.line : -1,
        // AST columns are 0-based; editors show 1-based.
        column: loc ? loc.start.column + 1 : -1,
      };
    },
  });

  return site;
};
