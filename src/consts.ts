export const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
} as const;

export const EXIT_CODES = {
  OK: 0,
  REPORT_ISSUES: 1,
  BAD_ARGS: 2,
  // 3 is intentionally unassigned — reserved for a potential future
  // git-dirty safety check (see research.md R-009).
  DECLINED: 4,
} as const;
