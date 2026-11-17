import { describe, expect, test } from 'bun:test';
import { detectModulePassedToFunction } from './detectModulePassedToFunction.js';

const detect = (source: string, importName = 's') =>
  detectModulePassedToFunction(source, importName);

describe('detectModulePassedToFunction', () => {
  describe('triggers when the whole module object is a direct call argument', () => {
    test('fn(s, x) triggers and returns a location', () => {
      const result = detect(`import s from './x.module.css';\nfn(s, 1);`);
      expect(result).not.toBeNull();
      expect(result?.line).toBe(2);
      expect(typeof result?.column).toBe('number');
    });

    test('responsiveClassNames(s, "--x", v) triggers', () => {
      const result = detect(
        `import s from './x.module.css';\nconst c = responsiveClassNames(s, "--x", v);`
      );
      expect(result).not.toBeNull();
    });

    test('triggers even when s is a later argument', () => {
      const result = detect(`import s from './x.module.css';\ncx(prefix, s);`);
      expect(result).not.toBeNull();
    });

    test('triggers for the composed form classNames(..., responsiveClassNames(s, ...))', () => {
      // The whole `s` reaches the inner `responsiveClassNames` call, even though
      // that call's result then flows into `classNames`. The object still
      // escapes into a function we cannot analyze.
      const result = detect(
        `classNames(s.root, responsiveClassNames(s, "--x", v));`
      );
      expect(result).not.toBeNull();
    });
  });

  describe('does NOT trigger for property hand-off or direct reads', () => {
    test('fn(s.root, x) does not trigger (property, not whole object)', () => {
      expect(detect(`fn(s.root, 1);`)).toBeNull();
    });

    test('classNames(s.root, ...) with a dynamic property read does not trigger', () => {
      // The `${x}` here is part of the JS source under test, not a placeholder
      // for this file; written as a template literal with an escaped `\${`.
      expect(
        detect(`classNames(s.root, cond && s[\`--c-\${x}\`]);`)
      ).toBeNull();
    });

    test('member read s.foo does not trigger', () => {
      expect(detect(`const a = s.foo;`)).toBeNull();
    });

    test('bracket read s["foo"] does not trigger', () => {
      expect(detect(`const a = s["foo"];`)).toBeNull();
    });

    test('template-literal property read does not trigger', () => {
      expect(detect(`const a = s[\`foo-\${x}\`];`)).toBeNull();
    });
  });

  describe('triggers when s is a direct argument of an inner call', () => {
    test('fn(wrap(s)) triggers (s is a direct argument of wrap)', () => {
      // `s` is handed whole to `wrap`; we cannot see what `wrap` does with it,
      // so ignoring the module is the conservative, zero-false-positive choice.
      expect(detect(`fn(wrap(s));`)).not.toBeNull();
    });
  });

  describe('triggers when the whole module escapes in any other way (issue #108)', () => {
    test.each([
      ['an object property value', `fn({ styles: s });`],
      ['a shorthand property', `fn({ s });`],
      ['a JSX prop', `const e = <Comp prop={s} />;`],
      [
        'a nested object in a JSX prop',
        `const e = <Modal transitionProps={{ classNames: s }} />;`,
      ],
      ['a spread', `const x = { ...s };`],
      ['an array element', `fn([s]);`],
      ['a variable assignment', `const x = s;`],
      ['a return value', `function f() { return s; }`],
      ['a constructor argument', `const w = new Wrapper(s);`],
      ['a destructuring source', `const { root } = s;`],
      ['a type assertion', `const a = (s as Record<string, string>)[k];`],
      ['a re-export', `export { s };`],
      ['a pattern default value', `function f({ a = s }) {}`],
      ['a parameter default value', `function f(a = s) {}`],
      ['an enum initializer', `enum E { A = s.x.length, B = fn(s) }`],
    ])('%s triggers', (_label, source) => {
      expect(detect(source)).not.toBeNull();
    });

    test('reports the location of the escaping reference', () => {
      const result = detect(
        `import s from './x.module.css';\nconst e = <Modal className={s.modal} transitionProps={{ classNames: s }} />;`
      );
      expect(result).toEqual({ line: 2, column: 69 });
    });
  });

  describe('does NOT trigger on names that are not a value reference', () => {
    test.each([
      ['the import itself', `import s from './x.module.css';`],
      ['a namespace import', `import * as s from './x.module.css';`],
      ['a type query', `type K = keyof typeof s;`],
      ['a type query in an annotation', `let k: keyof typeof s;`],
      ['a type query in an assertion', `const k = v as keyof typeof s;`],
      ['an object key', `const o = { s: 1 };`],
      ['a member property', `const a = other.s;`],
      ['a JSX attribute name', `const e = <Comp s={1} />;`],
      ['an optional member read', `const a = s?.foo;`],
      ['a typeof check', `if (typeof s === 'object') {}`],
      ['a void expression', `void s;`],
      ['a destructured parameter', `function C({ s }) { return 1; }`],
      ['a renamed destructuring target', `const { a: s } = x;`],
      ['an array pattern element', `const [s] = arr;`],
      ['a parameter with a default', `function f(s = 1) {}`],
      ['a rest parameter', `function f(...s) {}`],
      ['a function overload', `function f(s: string): void;`],
      ['a method overload', `class A { m(s: string): void; m(s: unknown) {} }`],
      ['a parameter property', `class A { constructor(private s: string) {} }`],
      ['an abstract member', `abstract class A { abstract s: string; }`],
      ['an enum member', `enum E { s }`],
      ['an enum name', `enum s { A }`],
      ['a namespace name', `namespace s { export const a = 1; }`],
      ['an import-equals name', `import s = require('./other');`],
      ['an index signature', `class A { [s: string]: unknown; }`],
      ['a namespace re-export', `export * as s from './other';`],
      ['a re-export from another module', `export { s } from './other';`],
      ['a type-only export', `export type { s };`],
      ['a type-only export specifier', `export { type s };`],
    ])('%s does not trigger', (_label, source) => {
      expect(detect(source)).toBeNull();
    });
  });

  describe('per-module scoping', () => {
    test('matches only the requested import name', () => {
      const source = `fn(s, 1);\notherFn(t.foo);`;
      expect(detectModulePassedToFunction(source, 't')).toBeNull();
      expect(detectModulePassedToFunction(source, 's')).not.toBeNull();
    });
  });
});
