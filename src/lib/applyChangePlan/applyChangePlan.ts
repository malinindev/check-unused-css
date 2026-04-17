import fs from 'node:fs';
import type { Rule } from 'postcss';
import type { ChangePlan, EditResult, FilePlan } from './types.js';

const applyFilePlan = (fp: FilePlan): EditResult => {
  if (fp.edits.length === 0) {
    return {
      file: fp.file,
      status: 'skipped',
      rulesRemoved: 0,
      selectorsStripped: 0,
      emptied: false,
      skipReason: 'nothing to apply',
    };
  }

  // Group edits by rule identity so we never mutate the same rule twice.
  // For any rule: a 'remove' edit wins over 'stripSelectors' — remove is
  // a superset action.
  const byRule = new Map<Rule, { remove: boolean; strip?: string }>();
  for (const edit of fp.edits) {
    const existing = byRule.get(edit.rule) ?? { remove: false };
    if (edit.kind === 'remove') {
      existing.remove = true;
    } else if (edit.kind === 'stripSelectors' && !existing.remove) {
      // Latest strip wins; in practice buildChangePlan produces at most one
      // strip candidate per rule since we only classify per unused class and
      // a subsequent dead class in the same rule would also be stripped
      // from an already-stripped selector — but we compose them here by
      // chaining if needed.
      if (existing.strip !== undefined) {
        // Combine: run strip on the already-stripped result by just taking
        // the latest survivingSelector that accounts for both dead sets.
        // buildChangePlan does not currently produce this case for a
        // single rule + multiple classes (it recomputes from rule.selectors),
        // so keep the latest.
        existing.strip = edit.survivingSelector;
      } else {
        existing.strip = edit.survivingSelector;
      }
    }
    byRule.set(edit.rule, existing);
  }

  let rulesRemoved = 0;
  let selectorsStripped = 0;

  for (const [rule, action] of byRule) {
    if (action.remove) {
      rule.remove();
      rulesRemoved++;
    } else if (action.strip !== undefined) {
      rule.selector = action.strip;
      selectorsStripped++;
    }
  }

  let newSource: string;
  try {
    newSource = fp.root.toString();
  } catch (err) {
    return {
      file: fp.file,
      status: 'failed',
      rulesRemoved: 0,
      selectorsStripped: 0,
      emptied: false,
      skipReason: `failed to stringify AST: ${(err as Error).message}`,
    };
  }

  try {
    fs.writeFileSync(fp.file, newSource, 'utf-8');
  } catch (err) {
    return {
      file: fp.file,
      status: 'failed',
      rulesRemoved: 0,
      selectorsStripped: 0,
      emptied: false,
      skipReason: `failed to write: ${(err as Error).message}`,
    };
  }

  const emptied = newSource.trim().length === 0;

  return {
    file: fp.file,
    status: 'written',
    rulesRemoved,
    selectorsStripped,
    emptied,
  };
};

export const applyChangePlan = (plan: ChangePlan): EditResult[] => {
  const results: EditResult[] = [];
  for (const fp of plan.files) {
    // Per FR-011 a single-file failure must not abort the whole run.
    try {
      results.push(applyFilePlan(fp));
    } catch (err) {
      results.push({
        file: fp.file,
        status: 'failed',
        rulesRemoved: 0,
        selectorsStripped: 0,
        emptied: false,
        skipReason: (err as Error).message,
      });
    }
  }
  return results;
};
