import type { Container, Document, Root, Rule } from 'postcss';
import { CssSyntaxError } from 'postcss';
import postcssScss from 'postcss-scss';
import type { Candidate, ChangePlan, FilePlan } from './types.js';
import { classifySelector } from './utils/classifySelector.js';
import { resolveEffectiveSelector } from './utils/resolveEffectiveSelector.js';
import { stripSelectorsFromList } from './utils/stripSelectorsFromList.js';

export type BuildChangePlanInput = {
  perFile: Array<{
    file: string; // absolute path
    cssSource: string; // raw CSS/SCSS source string
    unusedClassNames: string[]; // class names (no leading dot) from analysis
  }>;
};

type SlotVerdict = 'dead' | 'warn' | 'notMentioned';

type RuleVerdict = {
  // Per-authored-slot verdict after OR-ing across every unused class.
  slotVerdicts: SlotVerdict[];
  // className → appears if that class marks at least one slot as 'warn'
  // (regardless of whether another class marks the same slot as 'dead').
  warnClasses: Set<string>;
  // className → first slot index that this class kills. Used to pick a
  // representative `className` for the emitted Candidate.
  firstDeadByClass: Map<string, number>;
};

const verdictForRule = (rule: Rule, classNames: string[]): RuleVerdict => {
  const effective = resolveEffectiveSelector(rule);
  const authored = rule.selectors.map((s) => s.trim());

  // effective.length === parentBaseCount * authored.length by construction;
  // authored index cycles fastest. If that invariant ever breaks, we can't
  // trust per-slot classification — continuing with any fallback is a
  // destructive silent failure. Throw so the file is skipped via parseErrors
  // and the user sees it in the plan preview.
  if (authored.length === 0 || effective.length % authored.length !== 0) {
    throw new Error(
      `effective/authored mismatch (effective=${effective.length}, authored=${authored.length}) — refusing to classify "${rule.selector}". Please file a bug.`
    );
  }
  const base = effective.length / authored.length;

  // OR-reduce classification across every parent-slice for one (slot, class)
  // pair: any 'dead' short-circuits; 'warn' is sticky unless 'dead' arrives.
  const classifySlotForClass = (
    slotIndex: number,
    className: string
  ): SlotVerdict => {
    let verdict: SlotVerdict = 'notMentioned';
    for (let p = 0; p < base; p++) {
      const sel = effective[p * authored.length + slotIndex];
      if (sel === undefined) continue;
      const c = classifySelector(sel, className);
      if (c === 'dead') return 'dead';
      if (c === 'warn') verdict = 'warn';
    }
    return verdict;
  };

  const slotVerdicts: SlotVerdict[] = [];
  const warnClasses = new Set<string>();
  const firstDeadByClass = new Map<string, number>();

  for (let i = 0; i < authored.length; i++) {
    let slot: SlotVerdict = 'notMentioned';
    for (const name of classNames) {
      const thisClass = classifySlotForClass(i, name);
      if (thisClass === 'dead') {
        slot = 'dead';
        if (!firstDeadByClass.has(name)) firstDeadByClass.set(name, i);
      } else if (thisClass === 'warn') {
        warnClasses.add(name);
        if (slot === 'notMentioned') slot = 'warn';
      }
    }
    slotVerdicts.push(slot);
  }

  return { slotVerdicts, warnClasses, firstDeadByClass };
};

const buildFilePlan = (
  file: string,
  cssSource: string,
  unusedClassNames: string[]
): FilePlan => {
  const root: Root = postcssScss.parse(cssSource, { from: file });
  const edits: FilePlan['edits'] = [];
  const warnings: FilePlan['warnings'] = [];
  const rulesMarkedForRemoval = new Set<Rule>();

  const hasRemovedAncestor = (rule: Rule): boolean => {
    let parent: Container | Document | undefined = rule.parent;
    while (parent) {
      if (parent.type === 'rule' && rulesMarkedForRemoval.has(parent as Rule)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  };

  root.walkRules((rule) => {
    // A rule nested inside one that will be removed is already dead — don't
    // emit a duplicate edit for it. walkRules visits descendants after their
    // ancestor, so the parent's mark is already in place by this point.
    if (hasRemovedAncestor(rule)) return;

    const { slotVerdicts, warnClasses, firstDeadByClass } = verdictForRule(
      rule,
      unusedClassNames
    );
    const deadSlotCount = slotVerdicts.filter((v) => v === 'dead').length;
    if (deadSlotCount === 0 && warnClasses.size === 0) return;

    const line = rule.source?.start?.line ?? 1;
    const originalSelector = rule.selector;
    const authored = rule.selectors.map((s) => s.trim());

    const firstDeadClass = unusedClassNames.find((name) =>
      firstDeadByClass.has(name)
    );

    if (deadSlotCount === authored.length && firstDeadClass !== undefined) {
      edits.push({
        kind: 'remove',
        file,
        className: firstDeadClass,
        rule,
        originalSelector,
        line,
      } satisfies Candidate);
      rulesMarkedForRemoval.add(rule);
      return;
    }

    if (deadSlotCount > 0 && firstDeadClass !== undefined) {
      const deadSelectors = slotVerdicts
        .map((v, i) => (v === 'dead' ? authored[i] : undefined))
        .filter((s): s is string => typeof s === 'string');
      const surviving = stripSelectorsFromList(rule, deadSelectors);
      if (surviving === null) {
        throw new Error(
          `stripSelectorsFromList returned null despite surviving slots for ${file}:${line}`
        );
      }
      edits.push({
        kind: 'stripSelectors',
        file,
        className: firstDeadClass,
        rule,
        originalSelector,
        line,
        deadSelectors,
        survivingSelector: surviving,
      } satisfies Candidate);
    }

    // warnings: report each warn-class whose warning survives the edit.
    for (const name of unusedClassNames) {
      if (!warnClasses.has(name)) continue;
      if (deadSlotCount === authored.length) continue; // rule gone anyway
      warnings.push({
        kind: 'warn',
        file,
        className: name,
        rule,
        originalSelector,
        line,
      } satisfies Candidate);
    }
  });

  return {
    file,
    root,
    originalSource: cssSource,
    edits,
    warnings,
  };
};

export const buildChangePlan = (input: BuildChangePlanInput): ChangePlan => {
  const files: FilePlan[] = [];
  const parseErrors: ChangePlan['parseErrors'] = [];
  const internalErrors: ChangePlan['internalErrors'] = [];
  for (const entry of input.perFile) {
    if (entry.unusedClassNames.length === 0) continue;
    try {
      files.push(
        buildFilePlan(entry.file, entry.cssSource, entry.unusedClassNames)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // postcss's CssSyntaxError is the only error we want to label "parse
      // failed" — anything else is an assertion, invariant break, or bug
      // inside our own code and deserves a distinct bucket so the UI doesn't
      // lie to the user about what went wrong.
      if (err instanceof CssSyntaxError) {
        parseErrors.push({ file: entry.file, message });
      } else {
        console.error(
          `check-unused-css: internal error while planning "${entry.file}":`,
          err
        );
        internalErrors.push({ file: entry.file, message });
      }
    }
  }
  return { mode: 'remove', files, parseErrors, internalErrors };
};
