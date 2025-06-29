const removeColorsFromOutput = (output: string): string =>
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are needed for terminal output cleaning
  output.replace(/\u001B\[[0-9;]*m/g, '');

export const runCheckUnusedCss = (
  targetPath?: string
): { stdout: string; exitCode: number } => {
  const args = targetPath ? ['src/index.ts', targetPath] : ['src/index.ts'];

  const result = Bun.spawnSync(['bun', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = removeColorsFromOutput(result.stdout.toString());

  return {
    stdout,
    exitCode: result.exitCode,
  };
};
