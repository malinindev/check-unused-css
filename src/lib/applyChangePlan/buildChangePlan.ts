import type { Root, Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import { classifySelector } from './classifySelector.js';
import { resolveEffectiveSelector } from './resolveEffectiveSelector.js';
import { stripSelectorsFromList } from './stripSelectorsFromList.js';
import type { Candidate, ChangePlan, FilePlan } from './types.js';

export type BuildChangePlanInput = {
  perFile: Array<{
    file: string; // absolute path
    cssSource: string; // raw CSS/SCSS source string
    unusedClassNames: string[]; // class names (no leading dot) from analysis
  }>;
};

type ClassificationResult =
  | { kind: 'none' }
  | { kind: 'remove' }
  | { kind: 'strip'; dead: string[]; surviving: string }
  | { kind: 'warn' };

const classifyRule = (rule: Rule, className: string): ClassificationResult => {
  const effective = resolveEffectiveSelector(rule);
  const authored = rule.selectors.map((s) => s.trim());

  // Map authored selector → its effective form. We rely on positional pairing:
  // `rule.selectors` length corresponds to comma-entries; resolveEffective
  // produces one entry per (parentBase × authoredSelector) pair, so authored
  // length ≤ effective length. We classify per-authored-selector by checking
  // ALL effective forms that derived from it. Since Cartesian product with
  // parents only multiplies the count, we split `effective` into chunks
  // equal to `rule.selectors.length`.
  //
  // Specifically: effective.length === parentBaseCount * authored.length,
  // with authored index cycling fastest (see combine() loop in
  // resolveEffectiveSelector). We classify each authored slot by OR-ing the
  // classifications of all its effective forms.
  const base = effective.length / Math.max(authored.length, 1);
  const authoredClassifications: Array<'dead' | 'warn' | 'notMentioned'> = [];

  for (let i = 0; i < authored.length; i++) {
    let slotClass: 'dead' | 'warn' | 'notMentioned' = 'notMentioned';
    for (let p = 0; p < base; p++) {
      const idx = p * authored.length + i;
      const sel = effective[idx];
      if (sel === undefined) continue;
      const c = classifySelector(sel, className);
      if (c === 'dead') {
        slotClass = 'dead';
        break;
      }
      if (c === 'warn') {
        slotClass = 'warn';
      }
    }
    authoredClassifications.push(slotClass);
  }

  const deadIndices = authoredClassifications
    .map((c, i) => (c === 'dead' ? i : -1))
    .filter((i) => i >= 0);
  const warnOnly = authoredClassifications.some((c) => c === 'warn');

  if (deadIndices.length === 0) {
    return warnOnly ? { kind: 'warn' } : { kind: 'none' };
  }

  if (deadIndices.length === authored.length) {
    return { kind: 'remove' };
  }

  const deadSelectors = deadIndices
    .map((i) => authored[i])
    .filter((s): s is string => typeof s === 'string');
  const surviving = stripSelectorsFromList(rule, deadSelectors);
  if (surviving === null) {
    // Should not happen (we already checked not-all-dead), but defensively
    // degrade to remove.
    return { kind: 'remove' };
  }
  return { kind: 'strip', dead: deadSelectors, surviving };
};

const buildFilePlan = (
  file: string,
  cssSource: string,
  unusedClassNames: string[]
): FilePlan => {
  const root: Root = postcssScss.parse(cssSource, { from: file });
  const edits: FilePlan['edits'] = [];
  const warnings: FilePlan['warnings'] = [];
  const editedRules = new Set<Rule>();
  let totalRules = 0;

  root.walkRules((rule) => {
    totalRules++;
    for (const className of unusedClassNames) {
      const classification = classifyRule(rule, className);
      if (classification.kind === 'none') continue;

      const line = rule.source?.start?.line ?? 1;
      const originalSelector = rule.selector;

      if (classification.kind === 'remove') {
        edits.push({
          kind: 'remove',
          file,
          className,
          rule,
          originalSelector,
          line,
        } satisfies Candidate);
        editedRules.add(rule);
        break; // one remove is enough; don't keep classifying the same rule for other unused classes
      }

      if (classification.kind === 'strip') {
        edits.push({
          kind: 'stripSelectors',
          file,
          className,
          rule,
          originalSelector,
          line,
          deadSelectors: classification.dead,
          survivingSelector: classification.surviving,
        } satisfies Candidate);
        editedRules.add(rule);
        // Continue classifying for other unused classes in case multiple
        // classes appear in the same shared list (rare but possible).
        continue;
      }

      if (classification.kind === 'warn') {
        warnings.push({
          kind: 'warn',
          file,
          className,
          rule,
          originalSelector,
          line,
        } satisfies Candidate);
        // Don't break — a rule can be warn for multiple classes.
      }
    }
  });

  const willBeEmpty =
    totalRules > 0 &&
    edits.filter((c) => c.kind === 'remove').length === totalRules;

  return {
    file,
    root,
    originalSource: cssSource,
    edits,
    warnings,
    willBeEmpty,
  };
};

export const buildChangePlan = (input: BuildChangePlanInput): ChangePlan => {
  const files: FilePlan[] = [];
  for (const entry of input.perFile) {
    if (entry.unusedClassNames.length === 0) continue;
    files.push(
      buildFilePlan(entry.file, entry.cssSource, entry.unusedClassNames)
    );
  }
  return { mode: 'remove', files };
};
