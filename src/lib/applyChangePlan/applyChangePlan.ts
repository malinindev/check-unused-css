import fs from 'node:fs';
import path from 'node:path';
import type { Container, Root, Rule } from 'postcss';
import type { ChangePlan, EditResult, FilePlan } from './types.js';

// When the first child of a container is removed, the next child keeps its
// own `raws.before` — which typically starts with a blank-line sequence
// (`\n\n…` on LF, `\r\n\r\n…` on CRLF). At stringify time that renders as an
// orphan blank line right after the opening `{`. Collapse leading blank
// lines on each container's first surviving child, preserving the detected
// line ending.
const LEADING_BLANK_REPLACE = /(\r?\n)[\t ]*(?:\r?\n)+/g;

export const normalizeLeadingBlanks = (root: Root): void => {
  const fix = (container: Container): void => {
    const first = container.first;
    if (!first?.raws) return;
    const before = first.raws.before;
    if (typeof before !== 'string') return;
    const next = before.replace(LEADING_BLANK_REPLACE, (_m, nl: string) => nl);
    if (next !== before) first.raws.before = next;
  };
  fix(root);
  root.walk((node) => {
    if (node.type === 'rule' || node.type === 'atrule') {
      fix(node as Container);
    }
  });
};

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const failedResult = (file: string, skipReason: string): EditResult => ({
  file,
  status: 'failed',
  rulesRemoved: 0,
  selectorsStripped: 0,
  emptied: false,
  skipReason,
});

// Same-dir temp + rename is atomic on POSIX, so readers never see a partial
// file. Cleanup errors after a successful write surface as a warning so the
// user knows a stale .tmp sibling may need manual removal.
const writeFileAtomic = (file: string, content: string): void => {
  const dir = path.dirname(file);
  const tmp = path.join(
    dir,
    `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`
  );
  let wrote = false;
  try {
    fs.writeFileSync(tmp, content, 'utf-8');
    wrote = true;
    fs.renameSync(tmp, file);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch (cleanupErr) {
      if (wrote) {
        const msg =
          cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        console.warn(
          `check-unused-css: left orphan temp file "${tmp}" (cleanup failed: ${msg}). Remove manually.`
        );
      }
      // If write itself failed, tmp may not exist — safe to ignore.
    }
    throw err;
  }
};

const BOM = '\uFEFF';

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

  // Group by rule identity so no rule is mutated twice. `remove` wins over
  // `stripSelectors`; duplicate strips keep the last.
  const byRule = new Map<Rule, { remove: boolean; strip?: string }>();
  for (const edit of fp.edits) {
    const existing = byRule.get(edit.rule) ?? { remove: false };
    if (edit.kind === 'remove') {
      existing.remove = true;
    } else if (edit.kind === 'stripSelectors' && !existing.remove) {
      existing.strip = edit.survivingSelector;
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

  if (rulesRemoved > 0) {
    normalizeLeadingBlanks(fp.root);
  }

  let newSource: string;
  try {
    newSource = fp.root.toString();
  } catch (err) {
    return failedResult(
      fp.file,
      `failed to stringify AST: ${errorMessage(err)}`
    );
  }

  // postcss-scss does NOT round-trip a BOM via root.raws.bom the way
  // postcss's native stringifier does, so re-attach it explicitly when the
  // original source had one. Otherwise every Windows-originated file loses
  // its BOM on first run.
  const hadBom = fp.originalSource.charCodeAt(0) === 0xfeff;
  const startsWithBom = newSource.charCodeAt(0) === 0xfeff;
  if (hadBom && !startsWithBom) {
    newSource = BOM + newSource;
  }

  try {
    writeFileAtomic(fp.file, newSource);
  } catch (err) {
    return failedResult(fp.file, `failed to write: ${errorMessage(err)}`);
  }

  const emptied = newSource.replace(/^\uFEFF/, '').trim().length === 0;

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
    // One file's failure must not abort the rest of the plan.
    try {
      results.push(applyFilePlan(fp));
    } catch (err) {
      results.push(failedResult(fp.file, errorMessage(err)));
    }
  }
  return results;
};
