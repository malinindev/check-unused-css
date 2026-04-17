/**
 * Returns true when stdin is a real interactive terminal.
 *
 * Small wrapper so tests can replace this module; we don't reach for
 * `process.stdin.isTTY` directly at call sites.
 */
export const isStdinTty = (): boolean => process.stdin.isTTY === true;
