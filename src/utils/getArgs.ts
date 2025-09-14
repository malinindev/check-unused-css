import type { Args } from '../types.js';

export const getArgs = (): Args => {
  const args = process.argv.slice(2);
  let targetPath: string | undefined;
  const excludePatterns: string[] = [];
  let noDynamic = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === undefined) continue;

    if (arg === '--exclude' || arg === '-e') {
      const nextArg = args[i + 1];
      if (!nextArg || nextArg.startsWith('-')) {
        throw new Error('--exclude flag requires a pattern argument.');
      }
      excludePatterns.push(nextArg);
      i++; // Skip the next argument as it's the pattern
    } else if (arg.startsWith('--exclude=')) {
      const pattern = arg.substring(arg.indexOf('=') + 1);
      if (!pattern) {
        throw new Error('--exclude flag requires a pattern argument.');
      }
      excludePatterns.push(pattern);
    } else if (arg.startsWith('-e=')) {
      const pattern = arg.substring(arg.indexOf('=') + 1);
      if (!pattern) {
        throw new Error('-e flag requires a pattern argument.');
      }
      excludePatterns.push(pattern);
    } else if (arg === '--no-dynamic') {
      noDynamic = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      if (targetPath !== undefined) {
        throw new Error(
          'Multiple path arguments provided. Expected only one path argument.'
        );
      }
      targetPath = arg;
    }
  }

  return {
    targetPath,
    excludePatterns: excludePatterns.length > 0 ? excludePatterns : undefined,
    noDynamic,
  };
};
