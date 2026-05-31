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

  describe('does NOT trigger for non-call positions (documented boundary)', () => {
    test('fn([s]) does not trigger (s is inside an array literal)', () => {
      expect(detect(`fn([s]);`)).toBeNull();
    });

    test('fn({ styles: s }) does not trigger (s is a property value)', () => {
      expect(detect(`fn({ styles: s });`)).toBeNull();
    });

    test('spread {...s} does not trigger', () => {
      expect(detect(`const x = { ...s };`)).toBeNull();
    });

    test('assignment const x = s does not trigger', () => {
      expect(detect(`const x = s;`)).toBeNull();
    });

    test('return s does not trigger', () => {
      expect(detect(`function f() { return s; }`)).toBeNull();
    });

    test('JSX prop prop={s} does not trigger', () => {
      expect(detect(`const e = <Comp prop={s} />;`)).toBeNull();
    });

    test('new Wrapper(s) does not trigger (NewExpression, not CallExpression)', () => {
      expect(detect(`const w = new Wrapper(s);`)).toBeNull();
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
