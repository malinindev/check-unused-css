import path from 'node:path';
import { fileURLToPath } from 'node:url';

const removeColorsFromOutput = (output: string): string =>
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are needed for terminal output cleaning
  output.replace(/\u001B\[[0-9;]*m/g, '');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX_TS = path.resolve(HERE, '..', 'index.ts');

export type RunOptions = {
  targetPath?: string;
  excludePatterns?: string[];
  noDynamic?: boolean;
  /** Additional raw flags appended as-is (e.g. `['--remove', '--yes']`). */
  extraArgs?: string[];
  /**
   * How to wire stdin for the spawned CLI:
   *  - 'tty' (default): inherit from the test runner.
   *  - 'closed': close stdin immediately — simulates a non-TTY CI env.
   *  - a string: pipe the string verbatim (e.g. "n\n" to decline a prompt).
   */
  stdin?: 'tty' | 'closed' | string;
  /** Override the working directory for the spawned CLI. Defaults to process.cwd(). */
  cwd?: string;
};

export const runCheckUnusedCss = (
  targetPathOrOptions?: string | RunOptions,
  excludePatterns?: string[],
  noDynamic?: boolean
): { stdout: string; stderr: string; exitCode: number } => {
  // Positional-args form kept for older callsites.
  const options: RunOptions =
    typeof targetPathOrOptions === 'object' && targetPathOrOptions !== null
      ? targetPathOrOptions
      : {
          targetPath: targetPathOrOptions,
          excludePatterns,
          noDynamic,
        };

  const args = [INDEX_TS];
  if (options.targetPath) args.push(options.targetPath);
  if (options.excludePatterns && options.excludePatterns.length > 0) {
    for (const pattern of options.excludePatterns) {
      args.push('--exclude', pattern);
    }
  }
  if (options.noDynamic) args.push('--no-dynamic');
  if (options.extraArgs) args.push(...options.extraArgs);

  const stdinMode = options.stdin ?? 'tty';

  let stdinValue: unknown;
  if (stdinMode === 'tty') {
    stdinValue = 'inherit';
  } else if (stdinMode === 'closed') {
    stdinValue = null;
  } else {
    stdinValue = Buffer.from(stdinMode);
  }

  // Bun.spawnSync types hard-code `In = "ignore"`, but its runtime accepts
  // "inherit"/null/Buffer/etc. We pass a loose options bag so the test helper
  // can drive real interactive and non-interactive runs.
  const spawnOptions = {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: stdinValue,
    ...(options.cwd ? { cwd: options.cwd } : {}),
  } as unknown as Parameters<typeof Bun.spawnSync>[1];

  const result = Bun.spawnSync(['bun', ...args], spawnOptions);

  const stdout = removeColorsFromOutput((result.stdout ?? '').toString());
  const stderr = removeColorsFromOutput((result.stderr ?? '').toString());

  return {
    stdout,
    stderr,
    exitCode: result.exitCode,
  };
};
