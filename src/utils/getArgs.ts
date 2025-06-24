export const getArgs = (): { targetPath?: string } => {
  const args = process.argv.slice(2);

  if (args.length > 1) {
    throw new Error('Too many arguments. Expected only one path argument.');
  }

  const targetPath = args[0];

  return { targetPath };
};
