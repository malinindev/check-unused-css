import { describe, expect, test } from 'bun:test';
import { buildChangePlan } from './buildChangePlan.js';
import type { ChangePlan, FilePlan } from './types.js';

const build = (cssSource: string, unusedClassNames: string[] = ['unused']) =>
  buildChangePlan({
    perFile: [
      {
        file: '/virtual/test.module.scss',
        cssSource,
        unusedClassNames,
      },
    ],
  });

const firstFile = (plan: ChangePlan): FilePlan => {
  const f = plan.files[0];
  if (!f) throw new Error('expected at least one FilePlan');
  return f;
};

describe('buildChangePlan', () => {
  test('single dead top-level rule → one remove edit', () => {
    const plan = build('.unused { color: red }');
    expect(plan.files).toHaveLength(1);
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    expect(f.edits[0]?.kind).toBe('remove');
    expect(f.edits[0]?.className).toBe('unused');
    expect(f.edits[0]?.line).toBe(1);
    expect(f.warnings).toHaveLength(0);
  });

  test('used and unused side-by-side → only one remove', () => {
    const plan = build('.used { color: blue }\n.unused { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    expect(f.edits[0]?.kind).toBe('remove');
  });

  test('pseudo leading-anchor → remove', () => {
    const plan = build('.unused:hover { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    expect(f.edits[0]?.kind).toBe('remove');
  });

  test('compound leading-anchor (other.unused) → remove', () => {
    const plan = build('.other.unused { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    expect(f.edits[0]?.kind).toBe('remove');
  });

  test('descendant combinator rooted at .unused (.unused .x) → remove', () => {
    const plan = build('.unused .x { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    expect(f.edits[0]?.kind).toBe('remove');
  });

  test('non-leading descendant (.wrapper .unused) → warn only', () => {
    const plan = build('.wrapper .unused { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(0);
    expect(f.warnings).toHaveLength(1);
    expect(f.warnings[0]?.kind).toBe('warn');
  });

  test('shared list → stripSelectors candidate', () => {
    const plan = build('.used, .unused, .other { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    const edit = f.edits[0];
    expect(edit?.kind).toBe('stripSelectors');
    if (edit && edit.kind === 'stripSelectors') {
      expect(edit.deadSelectors).toEqual(['.unused']);
      expect(edit.survivingSelector).toBe('.used, .other');
    }
  });

  test('shared list all entries dead → remove (fully drained)', () => {
    const plan = build('.unused, .unused { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    expect(f.edits[0]?.kind).toBe('remove');
  });

  test('shared list with multiple unused classes across entries → single strip with all dead selectors', () => {
    const plan = build('.azaza, .modal, .test:hover { color: blue }', [
      'azaza',
      'test',
    ]);
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(1);
    const edit = f.edits[0];
    expect(edit?.kind).toBe('stripSelectors');
    if (edit && edit.kind === 'stripSelectors') {
      expect(edit.deadSelectors.sort()).toEqual(['.azaza', '.test:hover']);
      expect(edit.survivingSelector).toBe('.modal');
    }
  });

  test('nested &.unused inside used parent → remove', () => {
    const plan = build('.parent { color: blue; &.unused { color: red } }');
    const f = firstFile(plan);
    const removes = f.edits.filter((e) => e.kind === 'remove');
    expect(removes).toHaveLength(1);
  });

  test('parse errors become plan.parseErrors entries and good files still get processed', () => {
    const plan = buildChangePlan({
      perFile: [
        {
          file: '/virtual/bad.module.scss',
          cssSource: '.unused { color: }}}',
          unusedClassNames: ['unused'],
        },
        {
          file: '/virtual/good.module.scss',
          cssSource: '.unused { color: red }',
          unusedClassNames: ['unused'],
        },
      ],
    });
    expect(plan.parseErrors).toHaveLength(1);
    expect(plan.parseErrors[0]?.file).toBe('/virtual/bad.module.scss');
    expect(plan.parseErrors[0]?.message).toContain('bad.module.scss');
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0]?.file).toBe('/virtual/good.module.scss');
    expect(plan.files[0]?.edits).toHaveLength(1);
  });

  test('grandchild of a removed ancestor (3-level nesting) is not emitted', () => {
    const plan = build('.test { .a { .b { color: red } } }', ['test']);
    const f = firstFile(plan);
    const removes = f.edits.filter((e) => e.kind === 'remove');
    expect(removes).toHaveLength(1);
    expect(removes[0]?.line).toBe(1);
  });

  test('descendants of a removed parent rule are not emitted as separate edits', () => {
    // `.test { .closeButton { } }` with `test` unused: walkRules visits both
    // the parent and the nested rule. The parent is dead as a whole; the
    // nested rule's effective selector `.test .closeButton` is ALSO dead by
    // leading-compound rules. Without dedup we'd emit two `remove .test`
    // edits for the same authored block.
    const plan = build('.test { .closeButton { color: red } }', ['test']);
    const f = firstFile(plan);
    const removes = f.edits.filter((e) => e.kind === 'remove');
    expect(removes).toHaveLength(1);
    expect(removes[0]?.line).toBe(1);
  });

  test('nested descendant .unused (.parent { .unused { } }) → warn', () => {
    const plan = build('.parent { color: blue; .unused { color: red } }');
    const f = firstFile(plan);
    const removes = f.edits.filter((e) => e.kind === 'remove');
    expect(removes).toHaveLength(0);
    const warns = f.warnings;
    expect(warns).toHaveLength(1);
    expect(warns[0]?.originalSelector).toBe('.unused');
  });

  test('@media wrapper around .unused → still dead (at-rule does not change leading compound)', () => {
    const plan = build('@media print { .unused { color: red } }');
    const f = firstFile(plan);
    const removes = f.edits.filter((e) => e.kind === 'remove');
    expect(removes).toHaveLength(1);
  });

  test('unused class not mentioned anywhere → no edits, no warnings', () => {
    const plan = build('.used { color: red }');
    const f = firstFile(plan);
    expect(f.edits).toHaveLength(0);
    expect(f.warnings).toHaveLength(0);
  });

  test('zero unused class names → skip the file entirely', () => {
    const plan = buildChangePlan({
      perFile: [
        {
          file: '/virtual/empty.module.scss',
          cssSource: '.x { color: red }',
          unusedClassNames: [],
        },
      ],
    });
    expect(plan.files).toHaveLength(0);
  });

  test('comprehensive fixture: remove + strip + warn in same file', () => {
    const source = `
.unused { color: a }
.unused:hover { color: b }
.unused.mod { color: c }
.unused > .child { color: d }
.used, .unused, .other { color: e }
.parent { &.unused { color: f } }
.wrapper .unused { color: g }
.parent { .unused { color: h } }
.used { color: i }
`.trim();
    const plan = build(source);
    const f = firstFile(plan);

    const removes = f.edits.filter((e) => e.kind === 'remove');
    const strips = f.edits.filter((e) => e.kind === 'stripSelectors');
    expect(removes).toHaveLength(5); // .unused, .unused:hover, .unused.mod, .unused>.child, .parent{&.unused}
    expect(strips).toHaveLength(1); // .used, .unused, .other → .used, .other

    // warnings: .wrapper .unused + .parent{ .unused } (descendant)
    expect(f.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
