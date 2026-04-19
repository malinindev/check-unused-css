/**
 * Returns true when BOTH stdin and stdout are attached to an interactive
 * terminal. Required before issuing an interactive prompt: if stdout is
 * piped while stdin is a TTY, the question text goes to a file and the user
 * sees nothing yet the process still waits for keystrokes.
 */
export const isInteractiveTty = (): boolean =>
  process.stdin.isTTY === true && process.stdout.isTTY === true;
