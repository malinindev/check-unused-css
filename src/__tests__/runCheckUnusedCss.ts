const removeColorsFromOutput = (output: string): string =>
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are needed for terminal output cleaning
  output.replace(/\u001B\[[0-9;]*m/g, '');

export const runCheckUnusedCss = (
  targetPath?: string,
  excludePatterns?: string[],
  noDynamic?: boolean
): { stdout: string; stderr: string; exitCode: number } => {
  const args = ['src/index.ts'];

  if (targetPath) {
    args.push(targetPath);
  }

  if (excludePatterns && excludePatterns.length > 0) {
    for (const pattern of excludePatterns) {
      args.push('--exclude', pattern);
    }
  }

  if (noDynamic) {
    args.push('--no-dynamic');
  }

  const result = Bun.spawnSync(['bun', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = removeColorsFromOutput(result.stdout.toString());
  const stderr = removeColorsFromOutput(result.stderr.toString());

  return {
    stdout,
    stderr,
    exitCode: result.exitCode,
  };
};
